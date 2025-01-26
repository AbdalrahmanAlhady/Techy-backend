import { SelectQueryBuilder } from "typeorm";
import { QueryOptionsInput } from "../types/QueryOptionsInput";

export function createQueryOptions<T extends object>(
  qb: SelectQueryBuilder<T>,
  options: QueryOptionsInput
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
        if (key === 'price' && Array.isArray(value) && value.length === 2) {
          qb.andWhere(`${qb.alias}.${key} BETWEEN :start AND :end`, { start: value[0], end: value[1] });
        } else if (Array.isArray(value) && value.length > 0) {
          qb.andWhere(`${qb.alias}.${key} IN (:...${key})`, { [key]: value });
        } else if (!Array.isArray(value)) {
          qb.andWhere(`${qb.alias}.${key} = :${key}`, { [key]: value });
        }
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
