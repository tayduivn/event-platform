import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiUseTags } from '@nestjs/swagger';
import { EventId } from '../../../decorators/event-id.decorator';
import { Permissions } from '../../../decorators/permission.decorator';
import { User } from '../../../decorators/user.decorator';
import { PermissionsGuard } from '../../../guards/permission.guard';
import { UserModel } from '../../../models/user.model';
import { ValidationPipe } from '../../../pipes/validation.pipe';
import { PuzzleAnswerDto } from '../questions/puzzle-answer.dto';
import { PuzzleGraphNodes } from './puzzle-graph-nodes/puzzle-graph.nodes.model';
import { CreatePuzzleDto, CreatePuzzleHeroDto, CreateTrackDto } from './puzzle-heroes.dto';
import { PuzzleHeroes } from './puzzle-heroes.model';
import { PuzzleHeroesService, PuzzleHeroInfo } from './puzzle-heroes.service';
import { Score } from './scoreboard/score.model';
import { TeamSeries } from './scoreboard/team-series.model';
import { Tracks } from './tracks/tracks.model';

@ApiUseTags('PuzzleHero')
@Controller('puzzle-hero')
@UseGuards(PermissionsGuard)
export class PuzzleHeroesController {
    constructor(private puzzleHeroService: PuzzleHeroesService) {
    }

    @Post()
    @Permissions('csgames-api:create:puzzle-hero')
    public async create(@Body(ValidationPipe) dto: CreatePuzzleHeroDto, @EventId() eventId: string): Promise<PuzzleHeroes> {
        const puzzleHero = await this.puzzleHeroService.findOne({
            event: eventId
        });
        if (puzzleHero) {
            throw new BadRequestException('Cannot create more then one puzzle hero per event');
        }
        return await this.puzzleHeroService.create({
            ...dto,
            event: eventId
        });
    }

    @Post('start')
    @Permissions('csgames-api:create:puzzle-hero')
    public async start(@EventId() eventId: string): Promise<void> {
        await this.puzzleHeroService.start(eventId);
    }

    @Post('track')
    @Permissions('csgames-api:create:puzzle-hero')
    public async createTrack(@Body(ValidationPipe) dto: CreateTrackDto, @EventId() eventId: string): Promise<Tracks> {
        return await this.puzzleHeroService.createTrack(eventId, dto);
    }

    @Post('track/:trackId/puzzle')
    @Permissions('csgames-api:create:puzzle-hero')
    public async createPuzzle(@Body(ValidationPipe) dto: CreatePuzzleDto,
                              @Param('trackId') trackId: string,
                              @EventId() eventId: string): Promise<PuzzleGraphNodes> {
        return await this.puzzleHeroService.createPuzzle(eventId, trackId, dto);
    }

    @Post('puzzle/:puzzleId/validate')
    @Permissions('csgames-api:get:event')
    @HttpCode(HttpStatus.OK)
    public async validateAnswer(@EventId() id: string, @Param("puzzleId") puzzleId, @Body(ValidationPipe) dto: PuzzleAnswerDto,
                                @User() user: UserModel): Promise<void> {
        return await this.puzzleHeroService.validateAnswer(dto.answer, puzzleId, id, user.username);
    }

    @Get()
    @Permissions('csgames-api:get:puzzle-hero')
    public async get(@EventId() eventId: string, @User() user: UserModel,
                     @Query('type') type: string): Promise<PuzzleHeroes> {
        return await this.puzzleHeroService.getByEvent(eventId, user.username, type);
    }

    @Get('info')
    @Permissions('csgames-api:get:puzzle-hero')
    public async getInfo(@EventId() eventId: string): Promise<PuzzleHeroInfo> {
        return await this.puzzleHeroService.getInfo(eventId);
    }

    @Get('scoreboard')
    @Permissions('csgames-api:get:puzzle-hero')
    public async getScoreboard(@EventId() eventId: string): Promise<Score[]> {
        return await this.puzzleHeroService.getScoreboard(eventId);
    }

    @Get('team-series')
    @Permissions('csgames-api:get:puzzle-hero')
    public async getTeamsSeries(@EventId() eventId: string, @Query('teams-ids') teamsIds: string): Promise<TeamSeries[]> {
        return await this.puzzleHeroService.getTeamsSeries(eventId, teamsIds.split(','));
    }
}