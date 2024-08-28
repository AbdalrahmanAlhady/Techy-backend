import { SelectQueryBuilder } from "typeorm";

interface QueryOptions {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  filters?: { [key: string]: any };
  searchField?: string;
  searchTerm?: string;
  relations?: string[];
}

export function createQueryOptions<T extends object>(
  qb: SelectQueryBuilder<T>,
  options: QueryOptions
): SelectQueryBuilder<T> {
  let {
    page = 1,
    limit = 10,
    sortField,
    sortOrder = "ASC",
    filters = {},
    searchField,
    searchTerm,
    relations = [],
  } = options;

  // Apply pagination
  qb.skip((page - 1) * limit).take(limit);

  // Apply sorting
  if (sortField) {
    qb.orderBy(`${qb.alias}.${sortField}`, sortOrder);
  }

  // Apply filters
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) {
      qb.andWhere(`${qb.alias}.${key} = :${key}`, { [key]: value });
    }
  }

  // Apply search
  if (searchField && searchTerm) {
    qb.andWhere(`${qb.alias}.${searchField} LIKE :searchTerm`, {
      searchTerm: `%${searchTerm}%`,
    });
  }

  // Apply relations
  for (const relation of relations) {
    qb.leftJoinAndSelect(`${qb.alias}.${relation}`, relation);
  }

  return qb;
}
