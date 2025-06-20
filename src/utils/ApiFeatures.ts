import { Query, Document, FilterQuery } from 'mongoose';

interface FilterOperators {
  regex?: string;
  gte?: any;
  gt?: any;
  lte?: any;
  lt?: any;
  ne?: any;
  in?: any;
  nin?: any;
}

interface QueryString {
  [key: string]: any;
  page?: string;
  sort?: string;
  limit?: string;
  fields?: string;
  filter?: {
    [field: string]: string | string[] | FilterOperators;
  };
}

export class ApiFeatures<T extends Document> {
  query: Query<T[], T>;
  queryString: QueryString;

  constructor(query: Query<T[], T>, queryString: QueryString) {
    this.query = query;
    this.queryString = typeof queryString === 'object' && queryString !== null ? queryString : {};
  }

  private processFilterValue(value: any): any {
    if (Array.isArray(value)) {
      return { $in: value };
    }

    if (typeof value === 'string' && value.includes(',')) {
      return { $in: value.split(',').map((v) => v.trim()) };
    }

    if (typeof value === 'object' && value !== null) {
      const operatorMap: { [key: string]: string } = {
        gte: '$gte',
        gt: '$gt',
        lte: '$lte',
        lt: '$lt',
        ne: '$ne',
        in: '$in',
        nin: '$nin',
      };

      const mongoOperators: Record<string, any> = {};
      let isOperatorObject = false;

      if (value.regex && typeof value.regex === 'string') {
        return { $regex: value.regex, $options: 'i' };
      }

      for (const [opKey, opValue] of Object.entries(value)) {
        if (operatorMap[opKey]) {
          mongoOperators[operatorMap[opKey]] = opValue;
          isOperatorObject = true;
        }
      }

      return isOperatorObject ? mongoOperators : value;
    }

    return value;
  }

  filter(): this {
    const rawFilter = this.queryString.filter ?? this.queryString;
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'filter'];

    // Create a plain mutable object for processing
    const processedFilter: Record<string, any> = {};

    Object.entries(rawFilter).forEach(([key, value]) => {
      if (excludedFields.includes(key)) return;

      // Handle nested paths (e.g., 'address.city')
      if (key.includes('.')) {
        const keys = key.split('.');
        const lastKey = keys.pop()!;
        let current = processedFilter;

        for (const k of keys) {
          current[k] = current[k] ?? {};
          current = current[k];
        }

        current[lastKey] = this.processFilterValue(value);
      } else {
        processedFilter[key] = this.processFilterValue(value);
      }
    });

    this.query = this.query.find(processedFilter as FilterQuery<T>);
    return this;
  }

  sort(): this {
    if (this.queryString.sort) {
      const sortStr = this.queryString.sort.split(',').join(' ').trim();
      this.query = this.query.sort(sortStr);
    }
    // No default sorting to avoid assuming 'createdAt' exists
    return this;
  }

  limitFields(): this {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').map((f) => f.trim()).join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate(): this {
    const page = Math.max(parseInt(this.queryString.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(this.queryString.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}
// import { Query, Document, FilterQuery } from 'mongoose';
// import mongoose from 'mongoose';

// interface FilterOperators {
//   regex?: string;
//   gte?: any;
//   gt?: any;
//   lte?: any;
//   lt?: any;
//   ne?: any;
//   in?: any;
//   nin?: any;
// }

// interface QueryString {
//   [key: string]: any;
//   page?: string;
//   sort?: string;
//   limit?: string;
//   fields?: string;
//   filter?: {
//     [field: string]: string | string[] | FilterOperators;
//   };
// }

// export class ApiFeatures<T extends Document> {
//   query: Query<T[], T>;
//   queryString: QueryString;

//   constructor(query: Query<T[], T>, queryString: QueryString) {
//     this.query = query;
//     this.queryString = typeof queryString === 'object' && queryString !== null ? queryString : {};
//   }

// //  private processFilterValue(value: any): any {
// //   if (typeof value === 'object' && value !== null) {
// //     const mongoOperators = ['gte', 'gt', 'lte', 'lt', 'ne', 'in', 'nin'];
// //     const result: any = {};

// //     if (value.regex) {
// //       return { $regex: value.regex, $options: 'i' };
// //     }

// //     mongoOperators.forEach(op => {
// //       if (value[op] !== undefined) {
// //         result[`$${op}`] = value[op];
// //       }
// //     });

// //     return Object.keys(result).length > 0 ? result : value;
// //   }

// //   if (typeof value === 'string' && value.includes(',')) {
// //     return { $in: value.split(',').map((v) => v.trim()) };
// //   }

// //   return value;
// // }


// filter(): this {
//   const rawFilter = this.queryString.filter ?? this.queryString;
//   const excludedFields = ['page', 'sort', 'limit', 'fields', 'filter'];
//   excludedFields.forEach((field) => delete rawFilter[field]);

//   // Use a plain mutable object first
//   const processedFilter: Record<string, any> = {};

//   Object.entries(rawFilter).forEach(([key, value]) => {
//     // Nested path detection (e.g., 'address.city')
//     if (key.includes('.')) {
//       const keys = key.split('.');
//       const lastKey = keys.pop()!;
//       let current = processedFilter;

//       for (const k of keys) {
//         current[k] = current[k] ?? {};
//         current = current[k];
//       }

//       current[lastKey] = this.processFilterValue(value);
//     } else {
//       processedFilter[key] = this.processFilterValue(value);
//     }
//   });

//   // Finally cast to FilterQuery<T> for Mongoose
//   this.query = this.query.find(processedFilter as FilterQuery<T>);
//   return this;
// }

//   private processFilterValue(value: any): any {
//     if (Array.isArray(value)) {
//       return { $in: value };
//     }

//     if (typeof value === 'string' && value.includes(',')) {
//       return { $in: value.split(',').map((v) => v.trim()) };
//     }

//     if (typeof value === 'object') {
//       const operatorMap: { [key: string]: string } = {
//         gte: '$gte',
//         gt: '$gt',
//         lte: '$lte',
//         lt: '$lt',
//         ne: '$ne',
//         in: '$in',
//         nin: '$nin'
//       };

//       const mongoOperators: Record<string, any> = {};
//       let isOperatorObject = false;

//       for (const [opKey, opValue] of Object.entries(value)) {
//         if (opKey === 'regex' && typeof opValue === 'string') {
//           return { $regex: opValue, $options: 'i' };
//         }

//         if (operatorMap[opKey]) {
//           mongoOperators[operatorMap[opKey]] = opValue;
//           isOperatorObject = true;
//         }
//       }

//       if (isOperatorObject) {
//         return mongoOperators;
//       }

//       return value; // Return as-is if not matching known operators
//     }

//     return value;
//   }

//   sort(): this {
//     if (this.queryString.sort) {
//       const sortStr = this.queryString.sort.split(',').join(' ').trim();
//       this.query = this.query.sort(sortStr || '-createdAt');
//     } else {
//       this.query = this.query.sort('-createdAt');
//     }

//     return this;
//   }

//   limitFields(): this {
//     if (this.queryString.fields) {
//       const fields = this.queryString.fields.split(',').join(' ').trim();
//       this.query = this.query.select(fields || '-__v');
//     } else {
//       this.query = this.query.select('-__v');
//     }

//     return this;
//   }

//   paginate(): this {
//     const page = Math.max(parseInt(this.queryString.page || '1', 10), 1);
//     const limit = Math.min(Math.max(parseInt(this.queryString.limit || '200', 10), 1), 1000);
//     const skip = (page - 1) * limit;

//     this.query = this.query.skip(skip).limit(limit);
//     return this;
//   }
// }
