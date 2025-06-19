#!/bin/bash
MODULE=$1
sed "s/{{MODULE}}/$MODULE/g" << 'EOF' > src/models/$MODULE.model.ts
import { Schema, model, Document } from 'mongoose';
export interface I{{MODULE^}} extends Document {
  // define schema fields
}
const schema = new Schema<I{{MODULE^}}>({}, { timestamps: true });
export const {{MODULE^}} = model<I{{MODULE^}}>('{{MODULE^}}', schema);
EOF

sed "s/{{MODULE}}/$MODULE/g" << 'EOF' > src/controllers/$MODULE.controller.ts
import { Request, Response } from 'express';
import { {{MODULE^}} } from '../models/{{MODULE}}.model';
export const getAll = async (req: Request, res: Response) => {
  const all = await {{MODULE^}}.find();
  res.status(200).json({ data: all });
};
EOF

sed "s/{{MODULE}}/$MODULE/g" << 'EOF' > src/routes/${MODULE}.routes.ts
import { Router } from 'express';
import { getAll } from '../controllers/${MODULE}.controller';
const router = Router();
router.get('/', getAll);
export default router;
EOF

echo "Created model, controller, routes for ${MODULE}"
