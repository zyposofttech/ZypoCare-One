import { Module, Global } from '@nestjs/common';
import { NatsService } from './nats.service';

@Global() // Make it global so you can inject it anywhere
@Module({
  providers: [NatsService],
  exports: [NatsService],
})
export class NatsModule {}