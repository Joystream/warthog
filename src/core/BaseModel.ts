import * as shortid from 'shortid';
import { Field, ID, Int, InterfaceType, ObjectType } from 'type-graphql';
import {
  BeforeInsert,
  Column,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  VersionColumn,
} from 'typeorm';

import { IDType } from './types';

// This interface adds all of the base type-graphql fields to our BaseClass
@InterfaceType()
export abstract class BaseGraphQLObject {
  @Field(() => ID)
  id!: IDType;

  @Field(() => Date) createdAt!: Date;
  @Field(() => ID) createdById?: IDType;

  @Field(() => Date, { nullable: true })
  updatedAt?: Date;
  @Field(() => ID, { nullable: true })
  updatedById?: IDType;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;
  @Field(() => ID, { nullable: true })
  deletedById?: IDType;

  @Field(() => Int)
  version!: number;
}

// This class adds all of the TypeORM decorators needed to create the DB table
@ObjectType({ implements: BaseGraphQLObject })
export abstract class BaseModel implements BaseGraphQLObject {
  @PrimaryColumn({ type: String })
  id!: IDType;

  @Column() createdAt!: Date;
  @Column() createdById!: IDType;

  @Column({ nullable: true })
  updatedAt?: Date;
  @Column({ nullable: true })
  updatedById?: IDType;

  @Column({ nullable: true })
  deletedAt?: Date;
  @Column({ nullable: true })
  deletedById?: IDType;

  @VersionColumn() version!: number;

  getId() {
    // If settings allow ID to be specified on create, use the specified ID
    return this.id || shortid.generate();
  }

  // V3: DateTime should use getter to return ISO8601 string
  getValue(field: any) {
    const self = this as any;
    if (self[field] instanceof Date) {
      return self[field].toISOString();
    }
    return self[field];
  }

  @BeforeInsert()
  setId() {
    this.id = this.getId();
  }
}

// This class adds all of the TypeORM decorators needed to create the DB table
@ObjectType({ implements: BaseGraphQLObject })
export abstract class BaseModelUUID implements BaseGraphQLObject {
  @PrimaryGeneratedColumn('uuid')
  id!: IDType;

  @Column() createdAt!: Date;
  @Column() createdById!: IDType;

  @Column({ nullable: true })
  updatedAt?: Date;
  @Column({ nullable: true })
  updatedById?: IDType;

  @Column({ nullable: true })
  deletedAt?: Date;
  @Column({ nullable: true })
  deletedById?: IDType;

  @VersionColumn() version!: number;
}
