import type { DocSearchProps } from '@docsearch/react';
import { DocSearch } from '@docsearch/react';
import '@docsearch/react/style';
import type { JSX } from 'react';

function Search(props: Partial<DocSearchProps>): JSX.Element {
  return (
    <>
      <DocSearch
        appId="S44SFJSDVM"
        indices={props.indices}
        apiKey="b8861eddfef8fed983d25beff4084487"
        insights={true}
        placeholder="Search NetLogo docs"
        {...props}
      />
    </>
  );
}

export default Search;
