import { PLAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";
import path from "path";

import { FileSource, FileSourceRequestType } from "./filesource";

export class UnpayWallFileSource extends FileSource {
  static checkEnable(paperEntityDraft: PaperEntity) {
    return paperEntityDraft.doi !== "" || paperEntityDraft.title !== "";
  }

  static preProcess(paperEntityDraft: PaperEntity): FileSourceRequestType {
    const authEmail = "hi@paperlib.app";

    let queryUrl: string;
    if (paperEntityDraft.doi) {
      queryUrl = path.join(
        "https://api.unpaywall.org/v2/",
        paperEntityDraft.doi + "?email=" + authEmail,
      );
    } else {
      queryUrl =
        "https://api.unpaywall.org/v2/search" +
        "?query=" +
        paperEntityDraft.title +
        "&email=" +
        authEmail;
    }

    const headers = {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36",
    };

    return { queryUrl, headers };
  }

  static async queryProcess(
    queryUrl: string,
    headers: Record<string, string>,
    paperEntityDraft: PaperEntity | null,
  ): Promise<string> {
    const response = (await PLAPI.networkTool.get(queryUrl, headers, 0)) as {
      body: string;
    };
    const responseBody = JSON.parse(response.body);

    let downloadUrl = "";
    if (responseBody.best_oa_location) {
      downloadUrl = responseBody.best_oa_location.url_for_pdf;
    } else if (responseBody.results) {
      for (const result of responseBody.results) {
        if (
          result.response.title === paperEntityDraft?.title &&
          result.best_oa_location
        ) {
          downloadUrl = result.response.best_oa_location.url_for_pdf;
          break;
        }
      }
    }
    return downloadUrl;
  }
}
