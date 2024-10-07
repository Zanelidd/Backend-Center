import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get dbHost(): string {
    return <string>this.configService.get('app.database.host');
  }
  get dbPort(): number {
    return <number>this.configService.get('app.database.port');
  }
  get dbUsername(): string {
    return <string>this.configService.get('app.database.username');
  }
  get dbPassword(): string {
    return <string>this.configService.get('app.database.password');
  }
  get dbDatabase(): string {
    return <string>this.configService.get('app.database.database');
  }
}
