import { Interface } from "@/components/Interface";
import { InterfaceProvider } from "@/components/Interface/InterfaceProvider";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/Button";
import { modelFromJSON } from "@/model/utils";
import { InterfaceWithModels } from "@/types";
import { Map } from "immutable";
import { FC, useMemo, useState } from "react";

const LoadJSONForm: FC<{
  setValue(value: InterfaceWithModels): void;
}> = ({ setValue }) => {
  const [text, setText] = useState("{}");

  const parsedValue = useMemo(() => {
    try {
      const parsed = JSON.parse(text);
      if (parsed.models && parsed.catalog) {
        // TODO - better validation
        return {
          ...parsed,
          models: Map(
            parsed.models.map(([k, v]: any) => [k, modelFromJSON(v)])
          ),
        };
      }
    } catch {}

    return;
  }, [text]);

  return (
    <div className="flex flex-col gap-2">
      <header className="text-xl font-bold text-gray-700 mb-4">
        Paste JSON:
      </header>
      {/* TODO - extract styles to Textarea component */}
      <textarea
        className="p-1 rounded border border-gray-200 w-full text-xs h-32"
        placeholder="Paste JSON here"
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
      />
      <div className="self-end">
        <Button onClick={() => setValue(parsedValue)} disabled={!parsedValue}>
          Load
        </Button>
      </div>
    </div>
  );
};

export default function ScratchpadPage() {
  const [data, setData] = useState<InterfaceWithModels | undefined>(undefined);

  if (data) {
    return (
      <Layout>
        <InterfaceProvider initialValue={data}>
          <Interface />
        </InterfaceProvider>
      </Layout>
    );
  } else {
    return (
      <Layout>
        <div className="max-w-4xl p-8 mx-auto">
          <LoadJSONForm setValue={setData} />
        </div>
      </Layout>
    );
  }
}
