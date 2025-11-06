# Deploying the Documentation Site

## Environment Variables
- `PROJECT_ROOT`: The root directory of the project.
- `BUILD_REPO`: The Git repository URL for the documentation site.
- `PRODUCT_VERSION`: The version of the product being documented.
- `BUILD_LATEST`: A boolean flag indicating whether to build the `latest` version.

## Overview

```bash
set -e
source .env
```

First, we need to build the documentation site via `$PROJECT_ROOT/generate.sh`. This creates static files in the
`$PROJECT_ROOT/apps/.build` directory.

```
$PROJECT_ROOT
├── 📂 .build
│   ├── 📁 <product_version>          <!-- Version with non-prefixed URL -->
│   ├── 📁 <product_version>          <!-- Version with prefixed URL -->
```

```sh
yarn run build-docs
```

Second, we read the current contents of the `$BUILD_REPO/main` branch, this includes a `versions.json` file that lists
all the currently deployed versions.

```json
[
  { "version": "1.0", "dir": "1.0/", "displayName": "v1.0", "buildTime": "2023-01-01T00:00:00Z", "latest": false },
  { "version": "2.0", "dir": "2.0/", "displayName": "v2.0", "buildTime": null, "latest": true },
  //...
]
```
The main branch should also contain directories for each version listed in `versions.json` and a directory named
`latest` for the non-prefixed version.

```bash
# cwd: $PROJECT_ROOT
git clone $BUILD_REPO --branch main .repo
cd .repo
```

Third, we update the `versions.json` file with the new version information, including the build time, via an upsert.

```bash
# cwd: $PROJECT_ROOT/.repo
node ../.github/update-versions.js
```

Fourth, we copy the newly built static files from `$PROJECT_ROOT/apps/.build` into the appropriate directories in the
documentation repository. If the directory exists, we overwrite its contents. If it does not exist, we create it. We
only copy `latest` if the environment flag `BUILD_LATEST` is set to `true`.

```bash
# cwd: $PROJECT_ROOT/.repo
BUILD_DIR="../.build"

rm -rf $PRODUCT_VERSION/
cp -R $BUILD_DIR/$PRODUCT_VERSION/ $PRODUCT_VERSION/

if [ "$BUILD_LATEST" = "true" ]; then
  rm -rf latest/
  if [ -L $BUILD_DIR/latest ]; then
    TARGET_DIR=$(readlink $BUILD_DIR/latest)
    if [ -d "$TARGET_DIR" ]; then
      cp -R "$TARGET_DIR" latest/
    else
      echo "Error: latest symlink target is not a directory"
      exit 1
    fi
  elif [ -d $BUILD_DIR/latest ]; then
    cp -R $BUILD_DIR/latest/ latest/
  else
    echo "Error: latest directory does not exist"
    exit 1
  fi
fi
```

Fifth, we commit the changes to the documentation repository and push them to the `main` branch.

```bash
# cwd: $PROJECT_ROOT/.repo
git add .
git commit -m "Deploy documentation for version $PRODUCT_VERSION"
git push origin main
```

Sixth, trigger a deployment workflow to unroll `latest/` into the root of the documentation site and
deploy the changes to the hosting service.
