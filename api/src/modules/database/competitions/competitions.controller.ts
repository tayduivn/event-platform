import {
    Body,
    Controller,
    Delete, FileInterceptor,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put, UploadedFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { ApiUseTags } from '@nestjs/swagger';
import { EventId } from '../../../decorators/event-id.decorator';
import { Permissions } from '../../../decorators/permission.decorator';
import { PermissionsGuard } from '../../../guards/permission.guard';
import { BufferInterceptor } from '../../../interceptors/buffer.interceptor';
import { ValidationPipe } from '../../../pipes/validation.pipe';
import { Attendees } from '../attendees/attendees.model';
import { UpdateQuestionDto } from '../questions/questions.dto';
import {
    AuthCompetitionDto, CreateCompetitionDto, CreateCompetitionQuestionDto, CreateDirectorDto, UpdateCompetitionDto
} from './competitions.dto';
import { Competitions } from './competitions.model';
import { CompetitionResult, CompetitionsService } from './competitions.service';
import { User } from '../../../decorators/user.decorator';
import { UserModel } from '../../../models/user.model';
import { QuestionGraphNodes } from './questions/question-graph-nodes.model';
import { QuestionAnswerDto } from '../questions/question-answer.dto';
import { BooleanPipe } from '../../../pipes/boolean.pipe';

@ApiUseTags('Competition')
@Controller('competition')
@UseGuards(PermissionsGuard)
export class CompetitionsController {
    constructor(private competitionService: CompetitionsService) {
    }

    @Post()
    @Permissions('csgames-api:create:competition')
    public async create(@EventId() eventId: string, @Body(new ValidationPipe()) dto: CreateCompetitionDto): Promise<Competitions> {
        return await this.competitionService.create({
            ...dto,
            event: eventId
        });
    }

    @Post(':id/auth')
    @HttpCode(HttpStatus.OK)
    @Permissions('csgames-api:auth:competition')
    public async auth(@EventId() eventId: string,
                      @Param('id') competitionId: string,
                      @Body(new ValidationPipe()) dto: AuthCompetitionDto,
                      @User() user: UserModel): Promise<void> {
        await this.competitionService.auth(eventId, competitionId, dto, user);
    }

    @Post(':id/question')
    @Permissions('csgames-api:update:competition')
    public async createQuestion(@EventId() eventId: string,
                                @Param('id') competitionId: string,
                                @Body(new ValidationPipe(["type"])) dto: CreateCompetitionQuestionDto): Promise<QuestionGraphNodes> {
        return await this.competitionService.createQuestion(eventId, competitionId, dto);
    }

    @Post(':id/question/:questionId/validate')
    @HttpCode(HttpStatus.OK)
    @Permissions('csgames-api:validate-question:competition')
    public async validateQuestion(@EventId() eventId: string,
                                  @Param('id') competitionId: string,
                                  @Param('questionId') questionId: string,
                                  @Body(BooleanPipe, new ValidationPipe()) dto: QuestionAnswerDto,
                                  @UploadedFile('file') file: Express.Multer.File,
                                  @User() user: UserModel): Promise<void> {
        return await this.competitionService.validateQuestion(eventId, competitionId, questionId, {
            ...dto,
            file
        }, user);
    }

    @Post(':id/director')
    @Permissions('csgames-api:update:competition', 'csgames-api:create:attendee')
    public async createDirector(@EventId() eventId: string,
                                @Param('id') competitionId: string,
                                @Body(new ValidationPipe()) dto: CreateDirectorDto): Promise<Attendees> {
        return await this.competitionService.createDirector(eventId, competitionId, dto);
    }

    @Get(':id')
    @Permissions('csgames-api:get:competition')
    public async getCompetition(@EventId() eventId: string,
                                @Param('id') competitionId: string,
                                @User() user: UserModel): Promise<Competitions> {
        return await this.competitionService.getById(eventId, competitionId, user);
    }

    @Get(':id/result')
    @Permissions('csgames-api:get-result:competition')
    public async getCompetitionResult(@EventId() eventId: string,
                                      @Param('id') competitionId: string): Promise<CompetitionResult> {
        return await this.competitionService.getResult(eventId, competitionId);
    }

    @Get(':id/question/:questionId/result')
    @UseInterceptors(new BufferInterceptor("application/zip"))
    @Permissions('csgames-api:get-result:competition')
    public async getQuestionResult(@EventId() eventId: string,
                                   @Param('id') competitionId: string,
                                   @Param('questionId') questionId: string): Promise<Buffer> {
        return await this.competitionService.getQuestionResult(eventId, competitionId, questionId);
    }

    @Put(':id')
    @Permissions('csgames-api:update:competition')
    public async update(@EventId() eventId: string,
                        @Param('id') competitionId: string,
                        @Body(new ValidationPipe()) dto: UpdateCompetitionDto): Promise<void> {
        await this.competitionService.update({
            _id: competitionId,
            event: eventId
        }, dto);
    }

    @Put(':id/question/:questionId')
    @Permissions('csgames-api:update:competition')
    public async updateQuestion(@EventId() eventId: string,
                                @Param('id') competitionId: string,
                                @Param('questionId') questionId: string,
                                @Body(new ValidationPipe()) dto: UpdateQuestionDto): Promise<void> {
        await this.competitionService.updateQuestion(eventId, competitionId, questionId, dto);
    }

    @Put(':id/subscription')
    @Permissions('csgames-api:subscribtion:competition')
    public async subscribe(@EventId() eventId: string,
                           @Param('id') competitionId: string,
                           @User() user: UserModel) {
        await this.competitionService.subscribe(eventId, competitionId, user);
    }

    @Put(':id/director/:attendeeId')
    @Permissions('csgames-api:update:competition')
    public async addDirector(@EventId() eventId: string,
                             @Param('id') competitionId: string,
                             @Param('attendeeId') attendeeId: string): Promise<void> {
        return await this.competitionService.addDirector(eventId, competitionId, attendeeId);
    }

    @Delete(':id/question/:questionId')
    @Permissions('csgames-api:update:competition')
    public async removeQuestion(@EventId() eventId: string,
                                @Param('id') competitionId: string,
                                @Param('questionId') questionId: string): Promise<void> {
        await this.competitionService.removeQuestion(eventId, competitionId, questionId);
    }

    @Delete(':id/subscription')
    @Permissions('csgames-api:subscribtion:competition')
    public async unsubscribe(@EventId() eventId: string,
                             @Param('id') competitionId: string,
                             @User() user: UserModel) {
        await this.competitionService.unsubscribe(eventId, competitionId, user);
    }

    @Delete(':id/director/:attendeeId')
    @Permissions('csgames-api:update:competition')
    public async removeDirector(@EventId() eventId: string,
                                @Param('id') competitionId: string,
                                @Param('attendeeId') attendeeId: string): Promise<void> {
        return await this.competitionService.removeDirector(eventId, competitionId, attendeeId);
    }
}
