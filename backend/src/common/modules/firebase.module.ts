import { Global, Module } from "@nestjs/common";
import { FirebaseService } from "@/common/services/firebase.service";

/**
 * Global module that provides FirebaseService to all modules.
 * Imported once in AppModule; any module can inject FirebaseService
 * without explicitly importing this module.
 */
@Global()
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
