/**
 * Try to extract a parameter value from the document URL. For example, if the
 * paramName is 'param1', this will take a document.location.search like:
 *   `?param1=abc&param2=123&...`
 * It will:
 *  - strip the initial question mark
 *  - split the parameters based on the ampersands
 *  - grab the first match of `param1=`
 *  - split again based on the equals sign, coalescing to an empty string in
 *    case there was no match
 *  - finally returning the parameter value (on the right side of the equals
 *    sign)
 *
 * @param paramName The parameter whose value is desired
 */
export default function extractUrlParameter(paramName: string) {
  const paramMatcher = new RegExp(`^${paramName}=`);
  return (document.location.search
          .substring(1)
          .split("&")
          .find((s) => s.match(paramMatcher)) ?? ""
      ).split("=")[1];
}
