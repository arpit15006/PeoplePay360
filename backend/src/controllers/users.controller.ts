import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await UserService.listUsers({
      role: req.query.role as string | undefined,
      q: req.query.q as string | undefined,
    });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await UserService.getUserById(req.params.id) });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createUserSchema.parse(req.body);
    const user = await UserService.createUser(validated);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = updateUserSchema.parse(req.body);
    const user = await UserService.updateUser(req.params.id, validated, req.user!);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await UserService.deleteUser(req.params.id, req.user!);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}
