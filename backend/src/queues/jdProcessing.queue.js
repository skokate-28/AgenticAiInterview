import { Queue } from 'bullmq';
import redis from '../config/redis.js';

const jdQueue = new Queue('jd-processing', { connection: redis });

export default jdQueue;
