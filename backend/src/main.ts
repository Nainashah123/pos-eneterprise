// WHY: NestFactory is the core class that creates a NestJS application instance — it wires everything together.
// WHY: Reflector lets us read custom metadata (like @Public() or @Roles()) that we attach to routes via decorators.
import { NestFactory, Reflector } from '@nestjs/core';

// WHY: ValidationPipe automatically validates incoming request data against our DTO rules (e.g. "email must be a valid email").
import { ValidationPipe } from '@nestjs/common';

// WHY: SwaggerModule and DocumentBuilder are used to auto-generate an interactive API documentation page at /api/docs.
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

// WHY: AppModule is the root module — it imports all other feature modules (auth, products, orders, etc.) into one app.
import { AppModule } from './app.module';

// WHY: AllExceptionsFilter catches any unhandled error thrown anywhere in the app and formats it into a clean JSON response.
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

// WHY: ResponseInterceptor wraps every successful response in a standard shape: { success: true, data: ..., timestamp: ... }.
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

// WHY: JwtAuthGuard is a global guard that checks the Bearer token on every request — it blocks unauthenticated users.
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

// WHY: RolesGuard checks whether the logged-in user's role (ADMIN, MANAGER, CASHIER) is allowed to access a route.
import { RolesGuard } from './common/guards/roles.guard';

// WHY: compression middleware shrinks HTTP response bodies (gzip), making API responses faster to transmit over the network.
import * as compression from 'compression';

// WHY: helmet sets security-related HTTP headers (e.g. X-Frame-Options, X-Content-Type-Options) to protect against common attacks.
import helmet from 'helmet';

// WHY: bootstrap is an async function because NestJS setup involves async operations like connecting to a database.
async function bootstrap() {
  // WHY: NestFactory.create() reads AppModule, instantiates all services/controllers, and returns a running app object.
  const app = await NestFactory.create(AppModule);

  // Security
  // WHY: helmet() applies secure default HTTP headers; crossOriginResourcePolicy: 'cross-origin' allows images/assets to be loaded from other origins (e.g. the frontend).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // WHY: compression() automatically compresses response bodies with gzip so the frontend receives smaller payloads.
  app.use(compression());

  // CORS — allow localhost dev + any Vercel deployment URL
  // WHY: CORS (Cross-Origin Resource Sharing) controls which domains are allowed to call this API from a browser — without it the browser would block the frontend's requests.
  app.enableCors({
    // WHY: origin is a function so we can dynamically decide whether to allow each requesting domain, not just a static list.
    origin: (origin, callback) => {
      const allowed = [
        'http://localhost:3000',      // WHY: allow the local Next.js dev server to call this API during development.
        process.env.FRONTEND_URL,     // WHY: allow the production frontend URL set in the .env file.
      ].filter(Boolean); // WHY: filter(Boolean) removes undefined/null in case FRONTEND_URL is not set.

      // Allow Vercel preview/prod URLs and no-origin requests (mobile/curl)
      // WHY: !origin handles tools like curl or mobile apps that don't send an Origin header — we still want to allow them.
      // WHY: /\.vercel\.app$/.test(origin) allows any Vercel preview deployment URL to access the API without hardcoding each one.
      if (!origin || allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
        callback(null, true); // WHY: calling callback(null, true) tells CORS middleware "yes, this origin is allowed".
      } else {
        callback(new Error(`CORS blocked: ${origin}`)); // WHY: calling callback with an Error rejects the request with a CORS error.
      }
    },
    credentials: true,  // WHY: credentials: true allows the browser to send cookies and Authorization headers cross-origin.
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // WHY: explicitly list allowed HTTP methods — OPTIONS is needed for the browser's CORS preflight check.
  });

  // Global guards, filters, interceptors
  // WHY: app.get(Reflector) retrieves the Reflector singleton from NestJS's dependency injection container so our guards can read route metadata.
  const reflector = app.get(Reflector);

  // WHY: useGlobalGuards registers JwtAuthGuard and RolesGuard to run on EVERY incoming request automatically — no need to add them to each controller.
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));

  // WHY: useGlobalFilters registers AllExceptionsFilter to catch errors from every route and return a consistent error JSON format.
  app.useGlobalFilters(new AllExceptionsFilter());

  // WHY: useGlobalInterceptors registers ResponseInterceptor so every successful response is wrapped in { success: true, data: ..., timestamp: ... }.
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global prefix
  // WHY: setGlobalPrefix('api/v1') prepends /api/v1 to every route, so GET /products becomes GET /api/v1/products — this allows future versioning (v2, v3).
  app.setGlobalPrefix('api/v1');

  // Validation
  // WHY: ValidationPipe automatically validates all incoming request bodies against their DTO class rules before the handler runs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // WHY: whitelist: true strips any extra fields from the request body that aren't defined in the DTO — prevents unexpected data from getting in.
      transform: true,              // WHY: transform: true converts incoming plain JSON into proper class instances so DTO types and defaults work correctly.
      forbidNonWhitelisted: true,   // WHY: forbidNonWhitelisted: true throws a 400 error if the client sends extra fields, instead of silently ignoring them.
      transformOptions: { enableImplicitConversion: true }, // WHY: enableImplicitConversion automatically converts strings to numbers/booleans where the DTO type expects them (e.g. query param "?page=2" → number 2).
    }),
  );

  // Swagger
  // WHY: DocumentBuilder lets us configure the metadata for the auto-generated API docs page (title, description, version, auth type).
  const config = new DocumentBuilder()
    .setTitle('POS Enterprise API')                 // WHY: title shown at the top of the Swagger UI page.
    .setDescription('Enterprise Point of Sale System - REST API') // WHY: description shown below the title on the docs page.
    .setVersion('1.0')                              // WHY: API version number shown in the docs.
    // WHY: addBearerAuth tells Swagger to show an "Authorize" button so testers can enter their JWT and test protected endpoints from the docs UI.
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    // WHY: addTag groups related endpoints together in the Swagger UI for easier navigation.
    .addTag('auth', 'Authentication & Authorization')
    .addTag('stores', 'Store Management')
    .addTag('users', 'User Management')
    .addTag('categories', 'Product Categories')
    .addTag('products', 'Product Catalog')
    .addTag('inventory', 'Inventory Management')
    .addTag('customers', 'Customer Management')
    .addTag('orders', 'Order Processing')
    .addTag('payments', 'Payment Processing')
    .addTag('reports', 'Analytics & Reports')
    .addTag('ai', 'AI Features')
    .build(); // WHY: .build() finalises the configuration object — nothing is created yet, just the config is ready.

  // WHY: SwaggerModule.createDocument() reads all the controllers and their decorators to build the full OpenAPI spec object.
  const document = SwaggerModule.createDocument(app, config);

  // WHY: SwaggerModule.setup() mounts the interactive docs UI at the path 'api/docs' so you can visit http://localhost:3001/api/docs.
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true }, // WHY: persistAuthorization: true keeps the JWT token filled in even after you refresh the docs page — saves re-entering it constantly.
  });

  // WHY: process.env.PORT reads the PORT environment variable — useful on hosting platforms (like Railway or Heroku) that assign a port dynamically; falls back to 3001 locally.
  const port = process.env.PORT || 3001;

  // WHY: app.listen() starts the HTTP server and begins accepting incoming requests on the given port — this is the last step.
  await app.listen(port);

  console.log(`\n🚀 POS Enterprise API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs\n`);
}

// WHY: We call bootstrap() here to actually execute the startup logic — without this call the app would never start.
bootstrap();
