import { ArXivFileSource } from "@/filesources/arxiv";
import { FileSource } from "@/filesources/filesource";
import { SemanticScholarFileSource } from "@/filesources/semanticscholar";
import { UnpayWallFileSource } from "@/filesources/unpaywall";
import { PaperEntity } from "@/models/paper-entity";
import { chunkRun } from "@/utils/chunk";
import { PLAPI } from "paperlib";

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
    console.log(fileSources);
    const { results: updatedPaperEntities, errors } = await chunkRun<
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
            PLAPI.logService.error(
              "Failed to locate paper",
              error as Error,
              true,
              "PaperLocator",
            );
          }
        }

        return { paperEntityDraft: entityDraftOrNull, errors };

        return { paperEntityDraft: paperEntityDraft, errors };
      },
      async (paperEntityDraft: PaperEntity) => {
        return paperEntityDraft;
      },
    );

    return updatedPaperEntities;
  }
}
