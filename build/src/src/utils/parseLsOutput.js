/**
 * Devs are aware that this is not a recommended practice
 * http://mywiki.wooledge.org/ParsingLs
 * but this functionality is non-essential, so parsing errors are ok
 *
 * Sample output:
 *
 * total 56
 * drwxr-xr-x    2 root     root          4096 May  9 20:49 bin
 * drwxr-xr-x    5 root     root           340 May 21 21:35 dev
 * drwxr-xr-x    1 root     root          4096 May 21 21:35 etc
 * drwxr-xr-x    2 root     root          4096 May  9 20:49 home
 * drwxr-xr-x    1 root     root          4096 May  9 20:49 lib
 * drwxr-xr-x    5 root     root          4096 May  9 20:49 media
 * drwxr-xr-x    2 root     root          4096 May  9 20:49 mnt
 * drwxr-xr-x    2 root     root          4096 May  9 20:49 opt
 * dr-xr-xr-x  384 root     root             0 May 21 21:35 proc
 * drwx------    1 root     root          4096 May 21 21:35 root
 * drwxr-xr-x    2 root     root          4096 May  9 20:49 run
 * drwxr-xr-x    2 root     root          4096 May  9 20:49 sbin
 * drwxr-xr-x    2 root     root          4096 May  9 20:49 srv
 * dr-xr-xr-x   13 root     root             0 May 21 21:35 sys
 * drwxrwxrwt    2 root     root          4096 May  9 20:49 tmp
 * drwxr-xr-x    1 root     root          4096 May  9 20:49 usr
 * drwxr-xr-x    1 root     root          4096 May  9 20:49 var
 *
 * Columns:
 *
 * 1. file permissions,
 * 2. number of links,
 * 3. owner name,
 * 4. owner group,
 * 5. file size,
 * 6. time of last modification, and
 * 7. file/directory name
 *
 * File permissions:
 *
 * First character is - or l or d,
 * - d indicates a directory,
 * - "-" a line represents a file,
 * - l is a symlink (or soft link) - special type of file
 * [NOTE] there are many more file types, but IGNORE them
 * https://en.wikipedia.org/wiki/Unix_file_types
 * Then, three sets of characters, three times, indicating permissions for owner,
 * group and other:
 * - r = readable
 * - w = writable
 * - x = executable
 * For example -rwxrw-r--, this means the line displayed is:
 * - a regular file (displayed as -)
 * - readable, writable and executable by owner (rwx)
 * - readable, writable, but not executable by group (rw-)
 * - readable but not writable or executable by other (r--)
 */

function parseLsOutput(output) {
  let rows = output.split(/\r?\n/);
  // If the first row is the total count, ignore
  if (rows[0].toLowerCase().startsWith("total")) rows = rows.slice(1);

  return (
    rows
      .filter(row => row.startsWith("d") || row.startsWith("-"))
      .map(row => {
        const [
          permissions,
          numOfLinks,
          ownerName,
          ownerGroup,
          size,
          month,
          day,
          time,
          nameDefault
        ] = row.split(/\s+/);
        // Get the name as whatever follows the time column
        const name = (row.split(time)[1] || "").trim();
        return {
          isDirectory: permissions.slice(0, 1) === "d",
          permissions,
          numOfLinks,
          ownerName,
          ownerGroup,
          size,
          month,
          day,
          time,
          name: (name || nameDefault || "").trim()
        };
      })
      // When showing hidden files, the entries ".", ".." will pollute the view
      .filter(({ name }) => name !== "." && name !== "..")
  );
}

module.exports = parseLsOutput;
