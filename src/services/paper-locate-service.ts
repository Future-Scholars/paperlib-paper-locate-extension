import { PLAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";
import { chunkRun } from "paperlib-api/utils";

import { ArXivFileSource } from "@/filesources/arxiv";
import { FileSource } from "@/filesources/filesource";
import { SemanticScholarFileSource } from "@/filesources/semanticscholar";
import { UnpayWallFileSource } from "@/filesources/unpaywall";

const FILESOURCE_OBJS = new Map<string, typeof FileSource>([
  ["arxiv", ArXivFileSource],
  ["unpaywall", UnpayWallFileSource],
  ["semanticscholar", SemanticScholarFileSource],
]);

export class PaperLocateService {
  constructor() {}

  async locateFile(
    paperEntityDrafts: PaperEntity[],
    fileSources: string[],
  ): Promise<PaperEntity[]> {
    const { results: updatedPaperEntities, errors } = await chunkRun<
      PaperEntity,
      PaperEntity,
      PaperEntity
    >(
      paperEntityDrafts,
      async (paperEntityDraft: PaperEntity) => {
        let entityDraftOrNull: PaperEntity | null = null;
        for (const fileSource of fileSources) {
          try {
            const entityDraftOrNull =
              await FILESOURCE_OBJS.get(fileSource)?.download(paperEntityDraft);

            if (entityDraftOrNull) {
              break;
            }
          } catch (error) {
            PLAPI.logService.warn(
              `Failed to locate paper with ${fileSource}.`,
              `${(error as Error).name} - ${(error as Error).message}`,
              true,
              "PaperLocateExt",
            );
          }
        }

        return {
          paperEntityDraft: entityDraftOrNull || paperEntityDraft,
          errors,
        };
      },
      async (paperEntityDraft: PaperEntity) => {
        return paperEntityDraft;
      },
    );

    return updatedPaperEntities;
  }
}
