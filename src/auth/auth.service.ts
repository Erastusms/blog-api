import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse, UserResponse, JwtPayload } from '../common/types';

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;
  private readonly refreshTokenExpiry = 7; // days

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id);

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = await this.verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database
    const tokenExists = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenExists || tokenExists.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({
      where: { token: refreshToken },
    });

    // Generate new tokens
    return this.generateTokens(payload.sub);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });
    } else {
      // Delete all refresh tokens for user
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  async validateUser(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async generateTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Opsional: Hapus semua refresh token lama untuk user ini (untuk single-session; skip jika ingin multi-device)
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // Tambah nonce random untuk pastikan uniqueness JWT
    const nonce = Math.random().toString(36).substring(2);
    const payload = { sub: userId, nonce };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: 60 * 15, // 15 menit
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: parseInt(this.config.get('JWT_REFRESH_EXPIRES_IN', '604800'), 10), // Fix: Ganti key ke REFRESH, default 7 hari (604800 detik)
      }),
    ]);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpiry);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    if (!token || token.split('.').length !== 3) {
      throw new UnauthorizedException('Invalid token format');
    }

    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
    });

    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return payload;
  }
}
