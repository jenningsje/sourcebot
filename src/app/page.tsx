'use client';

import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { useNonEmptyQueryParam } from "@/hooks/useNonEmptyQueryParam";
import { GetSourceResponse, pathQueryParamName, repoQueryParamName, ZoektFileMatch } from "@/lib/types";
import { createPathWithQueryParams } from "@/lib/utils";
import { SymbolIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import logoDark from "../../public/sb_logo_dark.png";
import logoLight from "../../public/sb_logo_light.png";
import { CodePreview } from "./codePreview";
import { SearchBar } from "./searchBar";
import { SearchResults } from "./searchResults";
import { ThemeSelectorButton } from "./themeSelectorButton";

export default function Home() {
    const router = useRouter();
    const defaultQuery = useNonEmptyQueryParam("query") ?? "";
    const defaultNumResults = useNonEmptyQueryParam("numResults");

    const [query, setQuery] = useState(defaultQuery);
    const [numResults, _setNumResults] = useState(defaultNumResults && !isNaN(Number(defaultNumResults)) ? Number(defaultNumResults) : 100);

    const [isCodePanelOpen, setIsCodePanelOpen] = useState(false);
    const [code, setCode] = useState("");
    const [filepath, setFilepath] = useState("");

    const [fileMatches, setFileMatches] = useState<ZoektFileMatch[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchDurationMs, setSearchDurationMs] = useState(0);

    // @todo: We need to be able to handle the case when the user navigates backwards / forwards.
    // Currently we do not re-query.

    return (
        <main className="h-screen overflow-hidden">
            {/* TopBar */}
            <div className="sticky top-0 left-0 right-0 z-10">
                <div className="flex flex-row justify-between items-center py-1 px-2 gap-4">
                    <div className="grow flex flex-row gap-4 items-center">
                        <Image
                            src={logoDark}
                            className="h-12 w-auto hidden dark:block"
                            alt={"Sourcebot logo"}
                        />
                        <Image
                            src={logoLight}
                            className="h-12 w-auto block dark:hidden"
                            alt={"Sourcebot logo"}
                        />
                        <SearchBar
                            query={query}
                            numResults={numResults}
                            onQueryChange={(query) => setQuery(query)}
                            onLoadingChange={(isLoading) => setIsLoading(isLoading)}
                            onSearchResult={(result) => {
                                if (result) {
                                    setFileMatches(result.FileMatches ?? []);
                                    setSearchDurationMs(Math.round(result.Stats.Duration / 1000000));
                                }

                                router.push(`?query=${query}&numResults=${numResults}`);
                            }}
                        />
                        {isLoading && (
                            <SymbolIcon className="h-4 w-4 animate-spin" />
                        )}
                    </div>
                    <ThemeSelectorButton />
                </div>
                <Separator />
                <div className="bg-accent p-2">
                    <p className="text-sm font-medium">Results for: {fileMatches.length} files in {searchDurationMs} ms</p>
                </div>
                <Separator />
            </div>

            {/* Search Results & Code Preview */}
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel minSize={20}>
                    <SearchResults
                        fileMatches={fileMatches}
                        onOpenFileMatch={(match) => {
                            const url = createPathWithQueryParams(
                                `http://localhost:3000/api/source`,
                                [pathQueryParamName, match.FileName],
                                [repoQueryParamName, match.Repo]
                            );

                            // @todo : this query should definitely be cached s.t., when the user is switching between files,
                            // we aren't re-fetching the same file.
                            fetch(url)
                                .then(response => response.json())
                                .then((body: GetSourceResponse) => {
                                    setIsCodePanelOpen(true);
                                    setCode(body.content);
                                    setFilepath(match.FileName);
                                });
                        }}
                    />
                </ResizablePanel>
                <ResizableHandle withHandle={isCodePanelOpen} />
                <ResizablePanel
                    minSize={20}
                    hidden={!isCodePanelOpen}
                >
                    <CodePreview
                        code={code}
                        filepath={filepath}
                        onClose={() => setIsCodePanelOpen(false)}
                        keymapType="default"
                    />
                </ResizablePanel>
            </ResizablePanelGroup>
        </main>
    );
}
