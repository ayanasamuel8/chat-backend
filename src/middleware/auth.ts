import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';

export interface JWTPayload {
  sub?: string;
  id?: string;
  userId?: string;
  [key: string]: any;
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers['authorization'] || req.headers['Authorization'];
    if (!header || Array.isArray(header)) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Invalid Authorization header format' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set' });
    }

    const decoded = jwt.verify(token, secret as string) as JWTPayload;
    const userId = decoded.sub || decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Token payload missing user id' });
    }

    // Attach to request
    (req as any).userId = userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(userId: string, expiresIn: SignOptions['expiresIn'] = '7d') {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  const options: SignOptions = { expiresIn };
  return jwt.sign({ sub: userId }, secret as string, options);
}
