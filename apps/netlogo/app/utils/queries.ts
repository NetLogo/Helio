import { gql } from "graphql-request";

const queries = {
  introduction: gql`
    query {
      introduction {
        title
        description
      }
    }
  `,

  introSplash: gql`
    query GetIntroSplash {
      intro_splash {
        title
        description
        learn_more_link
        demo_image {
          id
        }
        featured_items {
          id
          image {
            id
          }
          type
          image_description
          column_title
          column_words {
            word
            url
          }
        }
      }
    }
  `,

  whyNetLogo: gql`
    query GetWhyNetLogo {
      why_netlogo {
        id
        title
        content
        icon
        order
      }
    }
  `,

  getNetLogo: gql`
    query GetGetNetLogo {
      get_netlogo {
        id
        title
        content
        icon
        link
        order
      }
    }
  `,

  community: gql`
    query GetCommunity {
      community {
        id
        Title
        Description
        Icon
        Link
        order
        Bordered
      }
    }
  `,

  partners: gql`
    query GetPartners {
      featured_partners {
        id
        partner_name
        partner_image
      }
    }
  `,

  contacts: gql`
    query getContacts {
      contact_data {
        heading
        body
      }
    }
  `,

  mainAnnouncements: gql`
    query getAnnouncements {
      announcements(sort: ["-date"]) {
        title
        date
        content
      }
    }
  `,

  officialNews: gql`
    query getNews {
      official_news(sort: ["-date"]) {
        id
        title
        date
        body
      }
    }
  `,

  referenceData: gql`
    query getReferences {
      References(limit: -1) {
        year
        reference
        is_ccl
      }
    }
  `,

  navigationData: gql`
    query GetNavigation {
      navigation_sections {
        name
        items {
          display_title
          url
          in_footer
        }
      }
    }
  `,

  aboutContent: gql`
    query getAbout {
      about {
        body
      }
    }
  `,

  educatorsContent: gql`
    query getEducators {
      educators {
        body
      }
    }
  `,

  campaignContent: gql`
    query getCampaign {
      campaign {
        body
      }
    }
  `,

  netlogoCon2026Content: gql`
    query getNetlogoCon2026 {
      netlogo_con_2026 {
        body
      }
    }
  `,

  netLogoVersions: gql`
    query GetNetLogoVersions {
      netlogo_versions {
        version
        download_links {
          platform
          download_url
        }
      }
    }
  `,

  resourcesData: gql`
    query GetResources {
      resources {
        section_title
        section_content
      }
    }
  `,

  mainPageData: gql`
    query GetAllData {
      introduction {
        title
        description
      }
      intro_splash {
        title

        description
        learn_more_link
        featured_items {
          id
          type
          image {
            id
          }
          image_description
          word_column_title
          column_words {
            word
            url
          }
          image_column_title
          column_images {
            image {
              id
            }
            word
          }
        }
      }
      why_netlogo {
        title
        content
        icon {
          id
        }
      }
      get_netlogo {
        title
        content
        icon {
          id
        }
        link
        button_text
      }
      community {
        title
        description
        icon {
          id
        }
        link
      }
      featured_partners {
        partner_name
        partner_image {
          id
        }
      }
    }
  `,

  downloadPageData: gql`
    query GetDownloadPageData {
      netlogo_versions {
        version
        download_links {
          platform
          download_url
          primary
          subplatform
          platform_icon {
            icon {
              id
            }
          }
        }
      }
      donation_data {
        title
        text
        image {
          id
        }
        url
      }
    }
  `,
  donationData: gql`
    query GetDonationData {
      donation_data {
        title
        text
        image {
          id
        }
        url
      }
    }
  `,
};

export default queries;
