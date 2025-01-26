import GraphQLJSON from "graphql-type-json";
import { InputType, Field, Int } from "type-graphql";

@InputType()
export class QueryOptionsInput {
  @Field(() => Int, { nullable: true })
  page?: number;

  @Field(() => Int, { nullable: true })
  limit?: number;

  @Field({ nullable: true })
  sortField?: string;

  @Field({ nullable: true })
  sortOrder?: "ASC" | "DESC";

  @Field({ nullable: true })
  searchField?: string;

  @Field({ nullable: true })
  searchTerm?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  filters?: { [key: string]: string[] };

  @Field(() => [String], { nullable: true })
  relations?: string[];
}
