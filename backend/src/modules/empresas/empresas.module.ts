import { Module } from "@nestjs/common";
import { EmpresasController } from "./infrastructure/empresas.controller";
import { EmpresasService } from "./application/empresas.service";
import { EmpresaFirestoreAdapter } from "./infrastructure/empresa-firestore.adapter";
import { EmpresaRepository } from "./domain/empresa-repository.interface";

@Module({
  controllers: [EmpresasController],
  providers: [
    EmpresasService,
    {
      provide: EmpresaRepository,
      useClass: EmpresaFirestoreAdapter,
    },
  ],
  exports: [EmpresasService],
})
export class EmpresasModule {}
