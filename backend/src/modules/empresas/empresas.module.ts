import { Module } from "@nestjs/common";
import { EmpresasController } from "./infrastructure/empresas.controller";
import { EmpresasService } from "./application/empresas.service";
import { FirebaseService } from "@/common/services/firebase.service";

@Module({
  controllers: [EmpresasController],
  providers: [EmpresasService, FirebaseService],
  exports: [EmpresasService, FirebaseService],
})
export class EmpresasModule {}
