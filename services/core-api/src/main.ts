import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app/app.module";
import { ValidationPipe } from "@nestjs/common";
import { correlation } from "./common/correlation.middleware";
import { PrismaClient } from "@zypocare/db";
// 1. IMPORT SWAGGER MODULES
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.setGlobalPrefix(process.env.API_GLOBAL_PREFIX || "api");
  app.enableCors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  });
  
  app.use(correlation); 
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true,forbidNonWhitelisted: true, }));

  // ==================================================
  // 2. ADD SWAGGER CONFIGURATION HERE
  // ==================================================
  const config = new DocumentBuilder()
    .setTitle('ZypoCare One API')
    .setDescription('API documentation for the ZypoCare Hospital Management System')
    .setVersion('1.0')
    .addBearerAuth() // Adds the "Authorize" button for JWT tokens
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // This sets up Swagger at /docs (e.g., http://localhost:4000/docs)
  SwaggerModule.setup('docs', app, document);
  // ==================================================

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/${process.env.API_GLOBAL_PREFIX || "api"}`);
  console.log(`📄 Swagger UI available at http://localhost:${port}/docs`); // Log the URL

  checkDatabase();
}

async function checkDatabase() {
  console.log("🔍 Checking Database content...");
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    console.log(`📊 Current User Count in DB: ${count}`);
    
    if (count === 0) {
      console.log("⚠️ Database is EMPTY. The Seed script did not run or failed.");
    } else {
      const users = await prisma.user.findMany();
      console.log("✅ Users found:", users.map(u => u.email));
    }
  } catch (error) {
    console.error("❌ Database Connection Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrap();