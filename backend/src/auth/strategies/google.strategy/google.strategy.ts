import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    
    constructor(private readonly authService: AuthService) {
        const callbackURL = 'https://waveflow.pro/api/auth/google/callback'

            
        super({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL,
            scope: ['email', 'profile'],
        });
        console.log('[GoogleStrategy] 초기화됨, callbackURL:', callbackURL);
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
        try {
            console.log('[GoogleStrategy.validate] 시작');
            console.log('[GoogleStrategy.validate] profile:', {
                id: profile.id,
                displayName: profile.displayName,
                emails: profile.emails,
            });

            const { id, displayName, emails } = profile;
            const email = emails[0].value;

            // 사용자 정보를 포함하여 done 콜백 호출
            done(null, {
                id,
                email,
                displayName,
            });
        } catch (error) {
            console.error('[GoogleStrategy.validate] 오류:', error);
            done(error, null);
        }
    }
}
