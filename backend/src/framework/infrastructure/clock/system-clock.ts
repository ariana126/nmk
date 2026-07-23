import { Clock } from '@framework/domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
