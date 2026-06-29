import type PocketBase from 'pocketbase';
import type { AuthUser } from '$lib/server/auth';

declare global {
  namespace App {
    interface Locals {
      pb: PocketBase;
      user: AuthUser | null;
    }
    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
