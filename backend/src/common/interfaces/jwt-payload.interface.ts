export interface JwtPayload {
  sub: string;       // userId
  email: string;
  role: string;
  storeId: string;
  iat?: number;
  exp?: number;
}
