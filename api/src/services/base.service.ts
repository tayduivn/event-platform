import { HttpException, HttpStatus } from "@nestjs/common";
import { MongoError } from "mongodb";
import { Document, DocumentDefinition, Model, ModelPopulateOptions } from "mongoose";

export class BaseService<T extends Document, Dto> {
    constructor(private readonly model: Model<T>) {
    }

    async create(object: Partial<T>): Promise<T> {
        const instance = new this.model(<T>object);
        try {
            return instance.save();
        } catch (e) {
            // Catch mongo errors like required, unique, min, max, etc...
            if (e instanceof MongoError) {
                throw new HttpException({
                    message: e.message,
                    code: e.code
                }, HttpStatus.PRECONDITION_FAILED);
            } else {
                throw e;
            }
        }
    }

    async findAll(populate?: ModelPopulateOptions | string): Promise<T[]> {
        if (!populate) {
            return this.model.find().exec();
        } else {
            return this.model.find().populate(populate).exec();
        }
    }

    async find(conditions: any, populate?: ModelPopulateOptions | string): Promise<T[]> {
        if (!populate) {
            return this.model.find(conditions).exec();
        } else {
            return this.model.find(conditions).populate(populate).exec();
        }
    }

    async findOne(condition: any, populate?: ModelPopulateOptions | string): Promise<T> {
        if (!populate) {
            return this.model.findOne(condition).exec();
        } else {
            return this.model.findOne(condition).populate(populate).exec();
        }
    }

    async findOneLean(condition: any, populate?: ModelPopulateOptions | ModelPopulateOptions[] | string): Promise<DocumentDefinition<T>> {
        if (!populate) {
            return this.model.findOne(condition).lean().exec();
        } else {
            return this.model.findOne(condition).populate(populate).lean().exec();
        }
    }

    async findById(id: Object | string | number, populate?: ModelPopulateOptions | string): Promise<T> {
        if (!populate) {
            return this.model.findById(id).exec();
        } else {
            return this.model.findById(id).populate(populate).exec();
        }
    }

    async update(condition: any, data: Partial<T>): Promise<any> {
        return this.model.updateOne(condition, <T>data).exec();
    }

    async updateMany(condition: any, data: Partial<T>): Promise<any> {
        return this.model.updateMany(condition, <T>data).exec();
    }

    async remove(condition: any): Promise<void> {
        await this.model.remove(condition).exec();
    }
}
