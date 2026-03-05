// Preserve .html file extensions in output paths so all existing links
// (which use explicit .html extensions) continue to work.
export default {
  permalink: (data) => {
    if (data.page.inputPath && data.page.inputPath.endsWith(".html")) {
      return data.page.filePathStem + ".html";
    }
  },
};
