import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { 
  connect, 
  NatsConnection, 
  JSONCodec, 
  JetStreamClient, 
  StorageType,  
  RetentionPolicy
} from 'nats';

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private nc: NatsConnection | undefined;
  private js: JetStreamClient | undefined;
  private logger = new Logger(NatsService.name);
  private jc = JSONCodec();

  async onModuleInit() {
    try {
      // Connect to NATS container
      this.nc = await connect({ servers: 'nats://localhost:4222' });
      this.js = this.nc.jetstream();
      this.logger.log('✅ Connected to NATS JetStream');
      
      // Initialize Streams
      await this.initStreams();
    } catch (err) {
      this.logger.error('❌ NATS Connection Failed', err);
    }
  }

  async initStreams() {
    // FIX 1: Guard clause to ensure connection exists before using it
    if (!this.nc) {
      this.logger.error('NATS connection not established, skipping stream init');
      return;
    }

    const jsm = await this.nc.jetstreamManager();
    
    // Create the 'Zypo' stream to capture all Zypo.* events
    await jsm.streams.add({
      name: 'Zypo_EVENTS',
      subjects: ['Zypo.>'],
      // FIX 2 & 3: Use strict Enums instead of raw numbers
      storage: StorageType.File,       // Was 1
      retention: RetentionPolicy.Limits, // Was 0
    });
    this.logger.log('🌊 Zypo_EVENTS Stream initialized');
  }

  async publish(subject: string, data: any) {
    if (!this.js) return;
    try {
      await this.js.publish(subject, this.jc.encode(data));
      this.logger.log(`📢 Published to [${subject}]`);
    } catch (e) {
      this.logger.error(`Failed to publish to ${subject}`, e);
    }
  }

  async onModuleDestroy() {
    await this.nc?.drain();
  }
}