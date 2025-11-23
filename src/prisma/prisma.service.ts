// src/prisma/prisma.service.ts
// import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// import { PrismaClient } from '@prisma/client';

// @Injectable()
// export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
//   async onModuleInit() {
//     await this.$connect();
//   }

//   async onModuleDestroy() {
//     await this.$disconnect();
//   }

//   async cleanDatabase() {
//     if (process.env.NODE_ENV === 'production') return;

//     const models = Reflect.ownKeys(this).filter((key) => key[0] !== '_');

//     return Promise.all(models.map((modelKey) => this[modelKey].deleteMany()));
//   }
// }

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async cleanDatabase() {
    // List manual model dari schema mu, urut dari child ke parent
    const models = [
      'refreshToken', // Depend pada User
      'notification', // Depend pada User
      'commentLike', // Depend pada Comment/User
      'postLike', // Depend pada Post/User
      'comment', // Depend pada Post/User
      'post', // Depend pada User
      'user', // Independen
    ];

    // Jalankan deleteMany secara sequential (bukan parallel) untuk urutan aman
    for (const model of models) {
      await this[model].deleteMany({}); // {} untuk delete semua
    }
  }
}
