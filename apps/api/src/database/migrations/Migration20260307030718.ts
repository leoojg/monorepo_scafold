import { Migration } from '@mikro-orm/migrations';

export class Migration20260307030718 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "audit_logs" ("id" uuid not null default gen_random_uuid(), "entity_type" varchar(255) not null, "entity_id" varchar(255) not null, "action" text check ("action" in ('create', 'update', 'delete')) not null, "changes" jsonb null, "performed_by_id" varchar(255) null, "performed_by_type" varchar(255) not null, "tenant_id" varchar(255) null, "metadata" jsonb null, "created_at" timestamptz not null, constraint "audit_logs_pkey" primary key ("id"));`);

    this.addSql(`create table "operators" ("id" uuid not null default gen_random_uuid(), "name" varchar(255) not null, "email" varchar(255) not null, "password_hash" varchar(255) not null, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "operators_pkey" primary key ("id"));`);
    this.addSql(`alter table "operators" add constraint "operators_email_unique" unique ("email");`);

    this.addSql(`create table "tenants" ("id" uuid not null default gen_random_uuid(), "name" varchar(255) not null, "slug" varchar(255) not null, "status" text check ("status" in ('active', 'suspended', 'trial')) not null default 'active', "settings" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "tenants_pkey" primary key ("id"));`);
    this.addSql(`alter table "tenants" add constraint "tenants_slug_unique" unique ("slug");`);

    this.addSql(`create table "companies" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "name" varchar(255) not null, "document" varchar(255) not null, "is_active" boolean not null default true, "settings" jsonb null, "billing_info" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "companies_pkey" primary key ("id"));`);
    this.addSql(`alter table "companies" add constraint "companies_document_unique" unique ("document");`);

    this.addSql(`create table "users" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "name" varchar(255) not null, "email" varchar(255) not null, "password_hash" varchar(255) not null, "role" text check ("role" in ('tenant_admin', 'company_admin')) not null, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "users_pkey" primary key ("id"));`);
    this.addSql(`alter table "users" add constraint "users_email_unique" unique ("email");`);

    this.addSql(`create table "user_companies" ("id" uuid not null default gen_random_uuid(), "user_id" uuid not null, "company_id" uuid not null, "role" text check ("role" in ('admin', 'member', 'viewer')) not null, "created_at" timestamptz not null, constraint "user_companies_pkey" primary key ("id"));`);

    this.addSql(`alter table "companies" add constraint "companies_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade;`);

    this.addSql(`alter table "users" add constraint "users_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade;`);

    this.addSql(`alter table "user_companies" add constraint "user_companies_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`);
    this.addSql(`alter table "user_companies" add constraint "user_companies_company_id_foreign" foreign key ("company_id") references "companies" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "companies" drop constraint "companies_tenant_id_foreign";`);

    this.addSql(`alter table "users" drop constraint "users_tenant_id_foreign";`);

    this.addSql(`alter table "user_companies" drop constraint "user_companies_company_id_foreign";`);

    this.addSql(`alter table "user_companies" drop constraint "user_companies_user_id_foreign";`);

    this.addSql(`drop table if exists "audit_logs" cascade;`);

    this.addSql(`drop table if exists "operators" cascade;`);

    this.addSql(`drop table if exists "tenants" cascade;`);

    this.addSql(`drop table if exists "companies" cascade;`);

    this.addSql(`drop table if exists "users" cascade;`);

    this.addSql(`drop table if exists "user_companies" cascade;`);
  }

}
