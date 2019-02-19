import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BaseService } from '../../../services/base.service';
import { PuzzleHeroes } from './puzzle-heroes.model';
import * as mongoose from 'mongoose';
import { Model } from 'mongoose';
import { Tracks } from './tracks/tracks.model';
import { PuzzleGraphNodes } from './puzzle-graph-nodes/puzzle-graph.nodes.model';
import { CreatePuzzleDto, CreateTrackDto } from './puzzle-heroes.dto';
import { Questions } from '../questions/questions.model';
import { Attendees } from '../attendees/attendees.model';
import { Teams } from '../teams/teams.model';
import { RedisService } from '../../redis/redis.service';
import { Score } from './scoreboard/score.model';
import { Schools } from '../schools/schools.model';
import { TeamSeries } from './scoreboard/team-series.model';

export interface PuzzleDefinition extends PuzzleGraphNodes {
    completed: boolean;
    locked: boolean;
    label: string;
    type: string;
}

@Injectable()
export class PuzzleHeroesService extends BaseService<PuzzleHeroes, PuzzleHeroes> {
    constructor(@InjectModel('puzzle-heroes') private readonly puzzleHeroesModel: Model<PuzzleHeroes>,
                @InjectModel('questions') private readonly questionsModel: Model<Questions>,
                @InjectModel('attendees') private readonly attendeesModel: Model<Attendees>,
                @InjectModel('teams') private readonly teamsModel: Model<Teams>,
                @InjectModel('schools') private readonly schoolsModel: Model<Schools>,
                private redisService: RedisService) {
        super(puzzleHeroesModel);
    }

    public async getByEvent(eventId: string, email: string): Promise<PuzzleHeroes> {
        const puzzleHero = await this.puzzleHeroesModel.findOne({
            event: eventId
        }).populate({
            path: 'tracks.puzzles.question',
            model: 'questions'
        }).exec();
        if (!puzzleHero) {
            throw new NotFoundException('No puzzle hero found');
        }

        const attendee = await this.attendeesModel.findOne({
            email
        }).select('_id').exec();
        const team = await this.teamsModel.findOne({
            attendees: attendee ? attendee._id : null,
            event: eventId
        }).select('_id').exec();
        const teamId = team ? team._id.toHexString() : null;

        const res = [];
        for (const track of puzzleHero.tracks) {
            res.push(await this.formatTrack(track.toJSON(), puzzleHero, teamId));
        }

        return {
            tracks: res
        } as PuzzleHeroes;
    }

    public async createTrack(eventId: string, dto: CreateTrackDto): Promise<Tracks> {
        let puzzleHero = await this.findOne({
            event: eventId
        });
        if (!puzzleHero) {
            throw new NotFoundException('No puzzle hero found');
        }

        puzzleHero.tracks.push(dto as Tracks);
        puzzleHero = await puzzleHero.save();

        return puzzleHero.tracks.pop();
    }

    public async createPuzzle(eventId: string, trackId: string, dto: CreatePuzzleDto): Promise<PuzzleGraphNodes> {
        let puzzleHero = await this.findOne({
            event: eventId
        });
        if (!puzzleHero) {
            throw new NotFoundException('No puzzle hero found');
        }

        const track = puzzleHero.tracks.find(x => x._id.equals(trackId));
        if (!track) {
            throw new NotFoundException('No track found');
        }

        if (dto.dependsOn) {
            const puzzle = track.puzzles.find(x => x._id.equals(dto.dependsOn));
            if (!puzzle) {
                throw new BadRequestException('Impossible deps');
            }
        }

        const question = await this.questionsModel.create({
            label: dto.label,
            description: dto.label,
            type: dto.type,
            validationType: dto.validationType,
            answer: dto.answer,
            score: dto.score
        });

        track.puzzles.push({
            question: question._id,
            dependsOn: dto.dependsOn
        } as PuzzleGraphNodes);

        puzzleHero = await puzzleHero.save();

        return puzzleHero.tracks
            .find(x => x._id.equals(trackId))
            .puzzles.find(x => (x.question as mongoose.Types.ObjectId).equals(question._id));
    }

    private async formatTrack(track: Tracks, puzzleHero: PuzzleHeroes, teamId: string): Promise<Tracks> {
        for (const puzzle of track.puzzles as PuzzleDefinition[]) {
            puzzle.completed = puzzleHero.answers.some(x => x.teamId === teamId && x.question === puzzle.question);
        }
        for (const puzzle of track.puzzles as PuzzleDefinition[]) {
            puzzle.label = (puzzle.question as Questions).label;
            puzzle.type = (puzzle.question as Questions).type;
            delete puzzle.question;

            puzzle.locked = false;
            if (!puzzle.dependsOn) {
                continue;
            }
            const depends = puzzleHero.answers.find(x => x.teamId === teamId && x.question === puzzle.dependsOn);
            if (!depends) {
                puzzle.locked = true;
            }
        }

        return track;
    }

    public async setTeamScore(eventId: string, teamId: string, score: number): Promise<void> {
        await this.redisService.zadd(`puzzle-hero:scoreboard:${eventId}`, teamId, score);
    }

    public async getScoreboard(eventId: string): Promise<Score[]> {
        const scores = await this.redisService.zrange(`puzzle-hero:scoreboard:${eventId}`, 0, -1);
        return (await Promise.all(scores.map(async (s) => {
            try {
                const team = await this.teamsModel.findOne({
                    event: eventId,
                    _id: s.value
                });

                const school = await this.schoolsModel.findById(team.school);

                return {
                    teamId: team._id.toHexString(),
                    teamName: team.name,
                    schoolName: school.name,
                    score: s.score
                };
            } catch (e) {
                return null;
            }
        }))).filter(s => !!s);
    }

    public async getTeamsSeries(eventId: string, teamsIds: string[]): Promise<TeamSeries[]> {
        const puzzleHero = await this.puzzleHeroesModel.findOne({
            event: eventId
        }).populate({
            path: 'answers.question',
            model: 'questions'
        }).exec();

        if (!puzzleHero) {
            throw new NotFoundException('No puzzle hero found');
        }

        return await Promise.all(
            teamsIds.map(async (teamId: string) => {
                const team = await this.teamsModel.findById(teamId);
                const answers = puzzleHero.answers
                    .filter(a => a.teamId.toString() === teamId)
                    .sort(((a, b) => (a.timestamp < b.timestamp) ? -1 : ((a.timestamp > b.timestamp) ? 1 : 0)));
                let lastScore = 0;
                const teamSeries: TeamSeries = {
                    name: team.name,
                    series: []
                };
                for (let answer of answers) {
                    lastScore += (answer.question as Questions).score;
                    teamSeries.series.push({
                        name: new Date(answer.timestamp),
                        value: lastScore
                    });
                }
                return teamSeries;
            })
        );
    }
}
