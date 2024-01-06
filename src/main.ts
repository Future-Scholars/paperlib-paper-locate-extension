import { PLAPI, PLExtAPI, PLExtension } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";

import { PaperLocateService } from "@/services/paper-locate-service";

interface IFileSourcePreference {
  type: "boolean";
  name: string;
  description: string;
  value: boolean;
}

class PaperlibPaperLocateExtension extends PLExtension {
  disposeCallbacks: (() => void)[];

  private readonly _paperLocateService: PaperLocateService;

  constructor() {
    super({
      id: "@future-scholars/paperlib-paper-locate-extension",
      defaultPreference: {
        "filesource-arxiv": {
          type: "boolean",
          name: "Arxiv",
          description: "arxiv.org",
          value: true,
          order: 1,
        },
        "filesource-unpaywall": {
          type: "boolean",
          name: "Unpaywall",
          description: "Unpaywall.org",
          value: true,
          order: 1,
        },
        "filesource-semanticscholar": {
          type: "boolean",
          name: "Semantic Scholar",
          description: "semanticscholar.org",
          value: true,
          order: 1,
        },
      },
    });

    this._paperLocateService = new PaperLocateService();

    this.disposeCallbacks = [];
  }

  async initialize() {
    await PLExtAPI.extensionPreferenceService.register(
      this.id,
      this.defaultPreference,
    );

    this.disposeCallbacks.push(
      PLAPI.hookService.hookModify("locateFile", this.id, "locateFile"),
    );
  }

  async dispose() {
    for (const disposeCallback of this.disposeCallbacks) {
      disposeCallback();
    }
    PLExtAPI.extensionPreferenceService.unregister(this.id);
  }

  async locateFile(paperEntityDrafts: PaperEntity[]) {
    console.time("locateFile");
    if (paperEntityDrafts.length === 0) {
      console.timeEnd("locateFile");

      return paperEntityDrafts;
    }

    const fileSources: string[] = [];
    const filesourcePref: Map<string, IFileSourcePreference> =
      PLExtAPI.extensionPreferenceService.getAll(this.id);

    for (const [id, enable] of filesourcePref.entries()) {
      if (enable && id.startsWith("filesource-")) {
        fileSources.push(id.replace("filesource-", ""));
      }
    }

    const updatedPaperEntityDrafts = await this._paperLocateService.locateFile(
      paperEntityDrafts
        .filter((paperEntityDraft) => {
          if (paperEntityDraft.mainURL) {
            return false;
          } else {
            return true;
          }
        })
        .map((paperEntityDraft) => {
          return new PaperEntity(paperEntityDraft, false);
        }),
      fileSources,
    );

    console.timeEnd("locateFile");
    return [updatedPaperEntityDrafts];
  }
}

async function initialize() {
  const extension = new PaperlibPaperLocateExtension();
  await extension.initialize();

  return extension;
}

export { initialize };
