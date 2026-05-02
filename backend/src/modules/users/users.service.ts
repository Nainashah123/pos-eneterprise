// WHY: These are NestJS exception classes. When you throw them, NestJS automatically
//   sends the right HTTP status code to the client:
//   - Injectable      → marks this class as something NestJS can inject elsewhere
//   - NotFoundException  → sends HTTP 404 (resource not found)
//   - ConflictException  → sends HTTP 409 (something already exists / conflicts)
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

// WHY: PrismaService is our database client. Every query to PostgreSQL goes through it.
//   Prisma generates type-safe methods like prisma.user.findMany() from our schema.
import { PrismaService } from '../../prisma/prisma.service';

// WHY: CreateUserDto defines what fields are required/optional when creating a user.
//   By importing the same DTO used by the controller, we stay consistent.
import { CreateUserDto } from './dto/create-user.dto';

// WHY: bcrypt is a password hashing library. NEVER store plain-text passwords.
//   bcrypt turns "MyPassword123" into a long scrambled string like "$2b$10$..."
//   that cannot be reversed. Even if the database is stolen, passwords stay safe.
import * as bcrypt from 'bcrypt';

// WHY: Role is the Prisma-generated enum for user roles (ADMIN, MANAGER, CASHIER).
//   Using the enum prevents typos and gives TypeScript auto-complete support.
import { Role } from '@prisma/client';

// WHY: @Injectable() tells NestJS this class can be injected as a dependency.
//   Without this decorator NestJS won't know how to create or share this class.
@Injectable()
export class UsersService {

  // WHY: We inject PrismaService so we can talk to the database.
  //   NestJS creates one shared PrismaService instance and passes it here automatically.
  constructor(private readonly prisma: PrismaService) {}

  // WHY: findAll returns every user that belongs to a specific store.
  //   `storeId` comes from the JWT token — not from the request body —
  //   so a cashier from Store A can never accidentally see users from Store B.
  async findAll(storeId: string) {
    return this.prisma.user.findMany({
      // WHY: `where` is a filter — only return rows where storeId matches.
      //   This is multi-tenant isolation: each store only sees its own data.
      where: { storeId },

      // WHY: `select` is crucial for security. Instead of returning ALL columns
      //   (which would include the hashed password!), we explicitly list only
      //   the safe, non-sensitive fields we actually want to send to the client.
      //   This is called "field projection" — we project only what we need.
      select: { id: true, email: true, name: true, role: true, active: true, lastLoginAt: true, createdAt: true },

      // WHY: `orderBy: { createdAt: 'desc' }` sorts newest users first.
      //   The most recently added staff appear at the top of the list.
      orderBy: { createdAt: 'desc' },
    });
  }

  // WHY: findOne looks up a single user by both id AND storeId.
  //   Checking storeId here is essential — without it, an admin from Store A
  //   could fetch users from Store B just by guessing a UUID.
  async findOne(storeId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      // WHY: Both `id` and `storeId` must match. This is a security boundary.
      where: { id, storeId },
      // WHY: Same `select` as findAll — password hash is never returned.
      select: { id: true, email: true, name: true, role: true, active: true, lastLoginAt: true, createdAt: true },
    });

    // WHY: If no user is found (wrong id or wrong store), throw NotFoundException.
    //   This automatically sends { statusCode: 404, message: "User not found" } to the client.
    //   We never return `null` to the controller — we let NestJS handle the error response.
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // WHY: create adds a new user account to the store.
  async create(storeId: string, dto: CreateUserDto) {

    // WHY: Before creating, check if this email is already taken in this store.
    //   `findUnique` uses the composite unique constraint `storeId_email` defined
    //   in the Prisma schema — two users in the same store cannot share an email,
    //   but the same email CAN exist across different stores (that's fine).
    const existing = await this.prisma.user.findUnique({
      where: { storeId_email: { storeId, email: dto.email } },
    });

    // WHY: If a user with this email already exists in this store, throw ConflictException.
    //   HTTP 409 Conflict tells the client "this email is already taken".
    if (existing) throw new ConflictException('Email already in use');

    // WHY: bcrypt.hash(dto.password, 10) hashes the plain-text password.
    //   The second argument (10) is the "salt rounds" — higher = slower but more secure.
    //   10 is the industry standard: secure enough, but not so slow it hurts performance.
    //   IMPORTANT: We save `hashed` to the database, NEVER the original dto.password.
    const hashed = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        storeId,
        // WHY: `...dto` spreads all fields from the DTO (email, name, role, etc.)
        ...dto,
        // WHY: We override `password` with the hashed version, overwriting dto.password.
        //   Order matters: the spread comes first, then `password: hashed` wins.
        password: hashed,
        // WHY: If no role was specified in the DTO, default to CASHIER — the lowest
        //   privilege role. This is "principle of least privilege": new accounts
        //   start with minimal access unless explicitly given more.
        role: dto.role || Role.CASHIER,
      },
      // WHY: Again, use `select` to avoid returning the hashed password in the response.
      //   The client only gets back the safe fields they need to confirm the user was created.
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  // WHY: update lets an admin change a user's details (name, role, email, password, etc.)
  //   `Partial<CreateUserDto>` means all fields are optional — send only what you want to change.
  async update(storeId: string, id: string, dto: Partial<CreateUserDto>) {

    // WHY: We call findOne first to verify the user exists AND belongs to this store.
    //   If the user doesn't exist, findOne throws NotFoundException and we stop here.
    //   This prevents updating a user from a different store.
    await this.findOne(storeId, id);

    // WHY: We copy the DTO into a mutable object `data`.
    //   `any` type is used here because we may add the hashed password dynamically below.
    const data: any = { ...dto };

    // WHY: If a new password was included in the update, hash it before saving.
    //   We must NEVER store the raw password — it must always be hashed with bcrypt.
    //   If no password is in the DTO, this block is skipped and the old password stays.
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      // WHY: `where: { id }` targets the specific user row to update.
      where: { id },
      // WHY: `data` contains only the fields the admin chose to change.
      //   Prisma only updates the columns present in `data` — unchanged fields stay the same.
      data,
      // WHY: `select` ensures the hashed password is never returned in the API response.
      select: { id: true, email: true, name: true, role: true, active: true },
    });
  }

  // WHY: toggleActive enables or disables a user account without deleting it.
  //   Soft-disabling is better than deleting because historical data (orders, etc.)
  //   still references this user's ID. Deleting would break those foreign key links.
  async toggleActive(storeId: string, id: string) {

    // WHY: Fetch the current user to read their current `active` value.
    //   Also validates the user exists and belongs to this store (findOne throws if not).
    const user = await this.findOne(storeId, id);

    return this.prisma.user.update({
      where: { id },
      // WHY: `!user.active` flips the boolean.
      //   If currently true (active) → becomes false (disabled).
      //   If currently false (disabled) → becomes true (active again).
      //   This is called a "toggle" — one endpoint handles both enable and disable.
      data: { active: !user.active },
      // WHY: We only return id and active — just enough to confirm the new state.
      select: { id: true, active: true },
    });
  }
}
