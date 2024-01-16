import stringSimilarity from "string-similarity";

import { PLExtAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";
import { stringUtils } from "paperlib-api/utils";

import { FileSource, FileSourceRequestType } from "./filesource";

export class SemanticScholarFileSource extends FileSource {
  static checkEnable(paperEntityDraft: PaperEntity): boolean {
    return (
      paperEntityDraft.doi !== "" ||
      paperEntityDraft.title !== "" ||
      paperEntityDraft.arxiv !== ""
    );
  }

  static preProcess(paperEntityDraft: PaperEntity): FileSourceRequestType {
    let queryUrl: string;

    if (paperEntityDraft.doi !== "") {
      queryUrl = `https://api.semanticscholar.org/graph/v1/paper/${paperEntityDraft.doi}?fields=title,isOpenAccess,openAccessPdf`;
    } else if (paperEntityDraft.arxiv !== "") {
      queryUrl = `https://api.semanticscholar.org/graph/v1/paper/arXiv:${
        paperEntityDraft.arxiv.toLowerCase().replace("arxiv:", "").split("v")[0]
      }?fields=title,isOpenAccess,openAccessPdf`;
    } else {
      queryUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${stringUtils.formatString(
        {
          str: paperEntityDraft.title,
          whiteSymbol: true,
        },
      )}&limit=10&fields=title,title,isOpenAccess,openAccessPdf`;
    }
    const headers = {};

    return { queryUrl, headers };
  }

  static async queryProcess(
    queryUrl: string,
    headers: Record<string, string>,
    paperEntityDraft: PaperEntity | null,
  ): Promise<string> {
    let response;
    try {
      response = await PLExtAPI.networkTool.get(
        queryUrl,
        headers,
        1,
        10000,
        false,
        true,
      );
    } catch (error) {
      if (
        (error as Error).name === "HTTPError" &&
        (error as Error).message === "Response code 404 (Not Found)"
      ) {
        return "";
      } else {
        throw error;
      }
    }

    const parsedResponse = response.body as
      | {
          data: {
            title: string;
            isOpenAccess: boolean;
            openAccessPdf?: {
              url: string;
              status: "HYBRID";
            };
          }[];
        }
      | {
          title: string;
          isOpenAccess: boolean;
          openAccessPdf?: {
            url: string;
            status: "HYBRID";
          };
        };

    let downloadUrl = "";

    let itemList;
    // @ts-ignore
    if (parsedResponse.data) {
      // @ts-ignore
      itemList = parsedResponse.data;
    } else {
      itemList = [parsedResponse];
    }

    for (const item of itemList) {
      const plainHitTitle = stringUtils.formatString({
        str: item.title,
        removeStr: "&amp;",
        removeSymbol: true,
        lowercased: true,
      });

      const existTitle = stringUtils.formatString({
        str: paperEntityDraft!.title,
        removeStr: "&amp;",
        removeSymbol: true,
        lowercased: true,
      });

      const sim = stringSimilarity.compareTwoStrings(plainHitTitle, existTitle);
      if (sim > 0.95) {
        if (item.isOpenAccess) {
          if (item.openAccessPdf) {
            downloadUrl = item.openAccessPdf.url;
          }
        }
        break;
      }
    }
    return downloadUrl;
  }
}
