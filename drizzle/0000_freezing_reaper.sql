CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"details" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"bazaar_entry_id" integer NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"items" text NOT NULL,
	"quantity" text NOT NULL,
	"price" double precision NOT NULL,
	"subtotal" double precision NOT NULL,
	"notes" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"approved_by" text,
	"receipt_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" double precision NOT NULL,
	"date" text NOT NULL,
	"method" text NOT NULL,
	"transaction_id" text,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"amount" double precision NOT NULL,
	"date" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"breakfast" boolean DEFAULT false NOT NULL,
	"lunch" boolean DEFAULT false NOT NULL,
	"dinner" boolean DEFAULT false NOT NULL,
	"guest_breakfast" integer DEFAULT 0 NOT NULL,
	"guest_lunch" integer DEFAULT 0 NOT NULL,
	"guest_dinner" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "unique_user_date" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text NOT NULL,
	"date" text NOT NULL,
	"author_id" text NOT NULL,
	"attachment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"system_name" text NOT NULL,
	"meal_lock_time" text NOT NULL,
	"default_meal_on" boolean NOT NULL,
	"currency" text NOT NULL,
	"guest_meal_limit" integer NOT NULL,
	"is_month_closed" boolean NOT NULL,
	"language" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"role" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"avatar_url" text,
	"default_meal_on" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vacation_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar_assignments" ADD CONSTRAINT "bazaar_assignments_bazaar_entry_id_bazaar_entries_id_fk" FOREIGN KEY ("bazaar_entry_id") REFERENCES "public"."bazaar_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar_assignments" ADD CONSTRAINT "bazaar_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar_entries" ADD CONSTRAINT "bazaar_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacation_periods" ADD CONSTRAINT "vacation_periods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;