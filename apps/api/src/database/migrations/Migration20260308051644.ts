import { Migration } from '@mikro-orm/migrations';

export class Migration20260308051644 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "refresh_tokens" ("id" uuid not null default gen_random_uuid(), "token_hash" varchar(255) not null, "operator_id" uuid not null, "family" uuid not null, "expires_at" timestamptz not null, "used_at" timestamptz null, "revoked_at" timestamptz null, "created_at" timestamptz not null, constraint "refresh_tokens_pkey" primary key ("id"));`);
    this.addSql(`alter table "refresh_tokens" add constraint "refresh_tokens_token_hash_unique" unique ("token_hash");`);
    this.addSql(`create index "refresh_tokens_family_index" on "refresh_tokens" ("family");`);

    this.addSql(`alter table "refresh_tokens" add constraint "refresh_tokens_operator_id_foreign" foreign key ("operator_id") references "operators" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "refresh_tokens" cascade;`);
  }

}
