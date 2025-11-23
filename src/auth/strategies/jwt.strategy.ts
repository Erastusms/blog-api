import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload, UserResponse } from '../../common/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // tambahkan ini biar lebih eksplisit
      secretOrKey: config.get<string>('JWT_SECRET') ?? '', // fallback ke string kosong
      // atau cara yang lebih tegas:
      // secretOrKey: config.get<string>('JWT_SECRET', { infer: true })!,
    });
  }

  async validate(payload: JwtPayload): Promise<UserResponse> {
    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
