import { PLExtension } from "@/models/extension";
import { PaperEntity } from "@/models/paper-entity";
import { PaperLocateService } from "@/services/paper-locate-service";
import { PLAPI, PLExtAPI } from "paperlib";

interface IFileSourcePreference {
  type: "boolean";
  name: string;
  description: string;
  value: boolean;
}

class PaperlibMetadataScrapeExtension extends PLExtension {
  disposeCallbacks: (() => void)[];

  private readonly _paperLocateService: PaperLocateService;

  constructor() {
    super({
      id: "paperlib-paper-locate-extension",
      name: "Paper Locator",
      description:
        "This extension is for locating paper files on internet for Paperlib",
      author: "Paperlib",
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
      PLAPI.hookService.hook("locateFile", this.id, "locateFile"),
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

      return [];
    }

    const fileSources: string[] = [];
    const filesourcePref: Record<string, IFileSourcePreference>[] =
      PLExtAPI.extensionPreferenceService.getAll(this.id);

    for (const [id, pref] of Object.entries(filesourcePref)) {
      if (pref.value && id.startsWith("filesource-")) {
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
          return new PaperEntity(false).initialize(paperEntityDraft);
        }),
      fileSources,
    );

    console.timeEnd("locateFile");
    return [updatedPaperEntityDrafts];
  }
}

async function initialize() {
  const extension = new PaperlibMetadataScrapeExtension();
  await extension.initialize();

  return extension;
}

export { initialize };
