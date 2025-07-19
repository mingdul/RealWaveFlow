import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    
    constructor(private readonly authService: AuthService) {
        super({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 'https://waveflow.pro/api/auth/google/callback',
        scope: ['email', 'profile'],
        });
    }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    try {
      const user = await this.authService.validateOAuthLogin(profile);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
