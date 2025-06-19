// src/utils/apiFeatures.ts
import { Query } from 'mongoose';

interface QueryString {
  [key: string]: any;
}

export class ApiFeatures<T> {
  query: Query<T[], T>;
  queryString: QueryString;

  constructor(query: Query<T[], T>, queryString: QueryString) {
    if (!queryString || typeof queryString !== 'object') {
      throw new Error('Query string must be a valid object');
    }
    this.query = query;
    this.queryString = queryString;
  }

  filter(): this {
    let filterObj = { ...this.queryString.filter ?? this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'filter'];
    excludedFields.forEach((el) => delete filterObj[el]);

    Object.keys(filterObj).forEach((key) => {
      const value = filterObj[key];

      if (value && typeof value === 'object' && value.regex) {
        filterObj[key] = { $regex: value.regex, $options: 'i' };
      } else if (value && typeof value === 'object') {
        ['gte', 'gt', 'lte', 'lt', 'ne', 'in', 'nin'].forEach((op) => {
          if (value[op] !== undefined) {
            filterObj[key] = { ...filterObj[key], [`$${op}`]: value[op] };
          }
        });
      } else if (Array.isArray(value)) {
        filterObj[key] = { $in: value };
      } else if (typeof value === 'string' && value.includes(',')) {
        filterObj[key] = { $in: value.split(',').map((item) => item.trim()) };
      }

      if (key.includes('.')) {
        const nestedKeys = key.split('.');
        let tempQuery = filterObj;
        for (let i = 0; i < nestedKeys.length - 1; i++) {
          tempQuery = tempQuery[nestedKeys[i]] = tempQuery[nestedKeys[i]] || {};
        }
        tempQuery[nestedKeys[nestedKeys.length - 1]] = value;
        delete filterObj[key];
      } else {
        filterObj[key] = value;
      }
    });

    this.query = this.query.find(filterObj);
    return this;
  }

  sort(): this {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ').trim();
      this.query = this.query.sort(sortBy || '-createdAt');
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields(): this {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ').trim();
      this.query = this.query.select(fields || '-__v');
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate(): this {
    const page = Math.max(parseInt(this.queryString.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(this.queryString.limit, 10) || 200, 1), 1000);
    const skip = (page - 1) * limit;
    if (skip < 0) throw new Error('Invalid page number');
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}
