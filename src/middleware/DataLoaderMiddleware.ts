import * as DataLoader from 'dataloader';
import { chunk } from 'lodash';
import { MiddlewareInterface, NextFn, ResolverData } from 'type-graphql';
import { Service } from 'typedi';

import { BaseContext } from '../core';

@Service()
export class DataLoaderMiddleware implements MiddlewareInterface<BaseContext> {
  async use({ context }: ResolverData<BaseContext>, next: NextFn) {
    if (!context.dataLoader.initialized) {
      context.dataLoader = {
        initialized: true,
        loaders: {},
      };

      const reqTimeout = Number(process.env.WARTHOG_RESOLVER_TIMEOUT_MS);
      const chunkSize = Number(process.env.WARTHOG_RELATION_CONCURRENCY) || 30;

      const abortSignal = reqTimeout ? AbortSignal.timeout(reqTimeout) : undefined;

      const loaders = context.dataLoader.loaders;

      context.connection.entityMetadatas.forEach((entityMetadata) => {
        const resolverName = entityMetadata.targetName;
        if (!resolverName) {
          return;
        }

        if (!loaders[resolverName]) {
          loaders[resolverName] = {};
        }

        entityMetadata.relations.forEach((relation) => {
          // define data loader for this method if it was not defined yet
          if (!loaders[resolverName][relation.propertyName]) {
            loaders[resolverName][relation.propertyName] = new DataLoader((entities: any[]) => {
              if (Array.isArray(entities) && entities[0] && Array.isArray(entities[0])) {
                throw new Error('You must flatten arrays of arrays of entities');
              }

              return chunk(entities, chunkSize).reduce<Promise<any[][]>>(
                async (prev, entityChunk) => {
                  const next = await prev;

                  if (abortSignal?.aborted) {
                    throw new Error('Resolver timed out');
                  }

                  const results = await Promise.all(
                    entityChunk.map((entity) =>
                      context.connection.relationLoader.load(relation, entity)
                    )
                  );

                  next.push(
                    ...results.map((related) =>
                      relation.isManyToOne || relation.isOneToOne ? related[0] : related
                    )
                  );

                  return next;
                },
                Promise.resolve([])
              );
            });
          }
        });
      });
    }

    return next();
  }
}
