<script lang="ts" setup>
import { slugifyOptions, toSlug } from '@repo/netlogo-docs/helpers';
import slugify from 'slugify';
import { products } from '~/assets/products';
import { ObjectModel, Service } from '~/data';

const route = useRoute();
const productId = slugify(decodeURIComponent(route.params.id as string), slugifyOptions);

const product = products.getProductById(productId);
if (!product) {
  throw createError({ statusCode: 404, statusMessage: `Product ${productId} Not Found` });
}

const tagsInfo = ref(getTagsInfo().filter(({ tagName }) => !['Learning Path', 'All'].includes(tagName)));

const maxPerSection = 6;
const requestPerSection = Math.max(maxPerSection, 15);

const fetched = await Promise.all(
  tagsInfo.value.map(({ tagName }) => {
    return useAsyncData(`product-${productId}-tag-${tagName}-first-15`, () => {
      return Service.Article.getArticlesInfoByTags([product.name, tagName], [], {
        count: requestPerSection,
        filterStrategy: 'every',
      });
    });
  }),
);

const content = computed(() => {
  const hasAppeared = new Set<string | undefined>([]);
  return fetched.map(({ data }, index) => {
    const tag = tagsInfo.value[index]!;
    const title = tag.title;
    const subtitle = tag.subtitle(product.name);
    return {
      title,
      subtitle,
      items:
        data.value
          ?.filter((item) => !hasAppeared.has(item.path))
          .filter((item) => {
            const article = new ObjectModel.Article(item);
            return !(tag.tagName === 'Tutorial' && article.meta?.badge !== 'Tutorial');
          })
          .slice(0, maxPerSection)
          .map((item) => {
            hasAppeared.add(item.path);
            return new ObjectModel.Article(item);
          }) ?? [],
    };
  });
});

const { data: prerequisiteArticles } = await useAsyncData(`product-${productId}-prereqs`, async () => {
  const entries = await Promise.all(
    (product.prerequisites ?? [])
      .filter((req) => req.type === 'article')
      .map(async ({ value: path }) => {
        return [path, await Service.Article.getArticleByPath(path)];
      }),
  );
  return Object.fromEntries(entries.filter(([, article]) => article !== null && article !== undefined));
});

const prerequisites = computed(() => {
  return (product.prerequisites ?? [])
    .map(({ type, value, title, icon }) => {
      switch (type) {
        case 'article': {
          const article = new ObjectModel.Article(prerequisiteArticles.value?.[value]);
          return {
            icon: icon ?? 'i-lucide-file-text',
            title: article.title,
            path: article.path,
          };
        }
        case 'product': {
          const product = products.getProductById(value) ?? products.getProductByName(value);
          if (!product) return null;
          return {
            icon: icon ?? product.iconName ?? 'i-lucide-box',
            title: 'Learn ' + product.name,
            path: getProductHome(product?.id),
          };
        }
        case 'url':
          return {
            icon: icon ?? 'i-lucide-external-link',
            path: value,
            title: title ?? value,
          };
        case 'text':
          return {
            icon: icon ?? 'i-lucide-info',
            title: value,
          };
        default:
          return null;
      }
    })
    .filter((req) => req !== null);
});

defineOgImageComponent('DocsSeo', {
  title: product.name,
  description: product.longDescription,
  theme: '#f31500',
});

useSeoMeta({
  robots: 'index, follow',
  author: 'Center for Connected Learning and Computer-Based Modeling',
  generator: 'Nuxt Content',
  ogDescription: product.description,
  ogTitle: `Learn ${product.name}`,
  ogType: 'website',
  title: `Learn ${product.name}`,
  description: product.description,
  keywords: [product.name, 'NetLogo', 'Learn', 'Agent-Based Modeling', 'Simulations'].join(', '),
});
</script>

<template>
  <UContainer>
    <div class="flex flex-col justify-center items-center w-full py-5">
      <section role="heading" class="flex flex-col gap-3 mx-auto lg:mx-0 w-fit">
        <ProductLogo :product="product" class="mx-auto" />

        <div class="flex gap-3 w-fit mb-5">
          <Button v-if="product.ctaPrimaryUrl && product?.ctaPrimaryLabel" variant="default" as-child>
            <NuxtLink :to="product.ctaPrimaryUrl">{{ product.ctaPrimaryLabel }}</NuxtLink>
          </Button>
          <Button v-if="product.ctaSecondaryUrl && product?.ctaSecondaryLabel" variant="outline" as-child>
            <NuxtLink :to="product.ctaSecondaryUrl">{{ product.ctaSecondaryLabel }}</NuxtLink>
          </Button>
        </div>
      </section>

      <div class="grid lg:grid-cols-2 items-center mt-[2rem] gap-4 w-full">
        <section class="no-stylized-heading h-full w-full">
          <Heading id="what-is" as="h3" class="text-start mt-0">What is {{ product.name }}?</Heading>
          <p class="leading-relaxed mb-0 break-spaces-normal">{{ product.longDescription }}</p>
        </section>
        <section class="no-stylized-heading h-full w-full">
          <Heading id="prerequisites" as="h3" class="text-start mt-0">Prerequisites</Heading>

          <ul>
            <li v-for="req in prerequisites" :key="req.title" class="flex items-center gap-2 mb-2">
              <Icon :name="req.icon" class="w-5 h-5 flex-shrink-0" />
              <NuxtLink v-if="req.path" :to="req.path">
                {{ req.title }}
              </NuxtLink>
              <span v-else class="bold line-clamp-1 text-ellipsis" :title="req.title">{{ req.title }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <section v-for="section in content" :key="section.title" class="my-8 flex flex-col gap-10">
      <div role="heading">
        <Heading :id="toSlug(section.title)" as="h2" class="no-stylized-heading mt-5 mb-2">
          {{ section.title }}
        </Heading>
        <span role="doc-subtitle">
          {{ section.subtitle }}
        </span>
      </div>
      <UBlogPosts class="no-stylized-heading">
        <UBlogPost
          v-for="article in section.items"
          :key="article.title"
          :title="article.title"
          :description="article.description"
          :date="article.createdDate"
          :badge="article.badge"
          :image="article.thumbnail"
          class="basis-1/4"
          variant="outline"
          :to="article.path"
          :ui="{
            title: 'my-3',
            badge: article.badgeClassName,
          }"
        />
      </UBlogPosts>

      <UEmpty
        v-if="section.items.length === 0"
        class="mx-auto no-stylized-heading [&_h2]:m-0"
        icon="i-lucide-file-search"
        :title="`No ${section.title} Available`"
        :description="`It looks like we don't have any ${section.title.toLowerCase()} for ${product.name} at this time.`"
        variant="naked"
      />
      <UButton
        v-else
        variant="link"
        class="text-xl text-center px-5 py-2 mx-auto"
        :to="`/product/${productId}/${slugify(section.title).toLowerCase()}`"
      >
        View all {{ section.title.toLowerCase() }} for {{ product.name }}
      </UButton>
    </section>

    <span class="block h-8 w-full"></span>
  </UContainer>
</template>
