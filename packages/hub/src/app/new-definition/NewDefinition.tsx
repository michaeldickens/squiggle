"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FC } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useMutation } from "react-relay";
import { graphql } from "relay-runtime";

import { Button, ColorInput, TextInput, useToast } from "@quri/ui";

import { NewDefinitionMutation } from "@/__generated__/NewDefinitionMutation.graphql";

const Mutation = graphql`
  mutation NewDefinitionMutation(
    $input: MutationCreateRelativeValuesDefinitionInput!
  ) {
    result: createRelativeValuesDefinition(input: $input) {
      __typename
      ... on BaseError {
        message
      }
      ... on CreateRelativeValuesDefinitionResult {
        definition {
          id
        }
      }
    }
  }
`;

export const NewDefinition: FC = () => {
  useSession({ required: true });

  const toast = useToast();

  const { register, handleSubmit, control } = useForm<{
    slug: string;
    title: string;
    items: {
      id: string;
      name: string;
      description: string;
      clusterId: string;
    }[];
    clusters: { id: string; color: string }[];
  }>();

  const {
    fields: clusterFields,
    append: appendCluster,
    remove: removeCluster,
  } = useFieldArray({
    name: "clusters",
    control,
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    name: "items",
    control,
  });

  const router = useRouter();

  const [saveMutation, isSaveInFlight] =
    useMutation<NewDefinitionMutation>(Mutation);

  const save = handleSubmit((data) => {
    saveMutation({
      variables: {
        input: {
          slug: data.slug,
          title: data.title,
          items: data.items,
          clusters: data.clusters,
        },
      },
      onCompleted(data) {
        if (data.result.__typename === "BaseError") {
          toast(data.result.message, "error");
        } else {
          router.push("/");
        }
      },
      onError(e) {
        toast(e.toString(), "error");
      },
    });
  });

  return (
    <form onSubmit={save}>
      <div className="max-w-2xl mx-auto">
        <div className="font-bold text-xl mb-4">
          New Relative Values definition
        </div>
        <div className="space-y-2">
          <TextInput register={register} name="slug" label="Slug" />
          <TextInput register={register} name="title" label="Title" />
          <div>
            <header className="font-bold text-lg mt-8">Clusters</header>
            <div className="space-y-2">
              <div className="space-y-8">
                {clusterFields.map((_, i) => (
                  <div key={i} className="border-t pt-8 border-slate-200">
                    <TextInput
                      register={register}
                      label="ID"
                      name={`clusters.${i}.id`}
                    />
                    <ColorInput
                      register={register}
                      label="Color"
                      name={`clusters.${i}.color`}
                    />
                    <Button onClick={() => removeCluster(i)}>Remove</Button>
                  </div>
                ))}
              </div>
              <Button onClick={() => appendCluster({ id: "", color: "" })}>
                Add cluster
              </Button>
            </div>
          </div>
          <div>
            <header className="font-bold text-lg mt-8">Items</header>
            <div className="space-y-2">
              <div className="space-y-8">
                {itemFields.map((_, i) => (
                  <div key={i} className="border-t pt-8 border-slate-200">
                    <TextInput
                      register={register}
                      label="ID"
                      name={`items.${i}.id`}
                    />
                    <TextInput
                      register={register}
                      label="Name"
                      name={`items.${i}.name`}
                    />
                    <TextInput
                      register={register}
                      label="Description"
                      name={`items.${i}.description`}
                    />
                    <TextInput
                      register={register}
                      label="Cluster ID"
                      name={`items.${i}.clusterId`}
                    />
                    <Button onClick={() => removeItem(i)}>Remove</Button>
                  </div>
                ))}
              </div>
              <Button
                onClick={() =>
                  appendItem({
                    id: "",
                    name: "",
                    description: "",
                    clusterId: "",
                  })
                }
              >
                Add item
              </Button>
            </div>
          </div>
          <Button onClick={save} disabled={isSaveInFlight} theme="primary">
            Save
          </Button>
        </div>
      </div>
    </form>
  );
};
