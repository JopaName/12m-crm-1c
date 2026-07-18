import { prisma } from "../db";

export class KnowledgeService {
  // ????????? Categories ?????????
  async getCategories() {
    return prisma.knowledgeCategory.findMany({
      where: { isArchived: false },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { articles: { where: { isArchived: false } } } },
        children: {
          where: { isArchived: false },
          orderBy: { sortOrder: "asc" },
          include: { _count: { select: { articles: { where: { isArchived: false } } } } },
        },
      },
    });
  }

  async createCategory(data: { name: string; slug: string; description?: string; icon?: string; color?: string; sortOrder?: number; parentId?: string }) {
    const existing = await prisma.knowledgeCategory.findUnique({ where: { slug: data.slug } });
    if (existing) throw new Error("?????????????????? ?? ?????????? slug ?????? ????????????????????");
    return prisma.knowledgeCategory.create({ data: { ...data, sortOrder: data.sortOrder ?? 0 } });
  }

  async updateCategory(id: string, data: { name?: string; slug?: string; description?: string; icon?: string; color?: string; sortOrder?: number; parentId?: string | null }) {
    if (data.slug) {
      const existing = await prisma.knowledgeCategory.findUnique({ where: { slug: data.slug } });
      if (existing && existing.id !== id) throw new Error("?????????????????? ?? ?????????? slug ?????? ????????????????????");
    }
    return prisma.knowledgeCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    const hasArticles = await prisma.knowledgeArticle.count({ where: { categoryId: id, isArchived: false } });
    if (hasArticles > 0) {
      return prisma.knowledgeCategory.update({ where: { id }, data: { isArchived: true } });
    }
    return prisma.knowledgeCategory.update({ where: { id }, data: { isArchived: true } });
  }

  // ????????? Articles ?????????
  async getArticles(params: { categoryId?: string; search?: string; page?: number; limit?: number }) {
    const { categoryId, search, page = 1, limit = 50 } = params;
    const where: any = { isArchived: false };
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { tags: { contains: search } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.knowledgeArticle.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      prisma.knowledgeArticle.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getArticleById(id: string) {
    const article = await prisma.knowledgeArticle.findFirst({
      where: { id, isArchived: false },
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
    if (article) {
      await prisma.knowledgeArticle.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    }
    return article;
  }

  async createArticle(data: {
    title: string; content: string; excerpt?: string; categoryId: string;
    tags?: string; isPublished?: boolean; createdById: string;
  }) {
    return prisma.knowledgeArticle.create({
      data: {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt || data.content.substring(0, 200),
        categoryId: data.categoryId,
        tags: data.tags || "",
        isPublished: data.isPublished ?? true,
        createdById: data.createdById,
      },
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
  }

  async updateArticle(id: string, data: {
    title?: string; content?: string; excerpt?: string; categoryId?: string;
    tags?: string; isPublished?: boolean; updatedById: string;
  }) {
    return prisma.knowledgeArticle.update({
      where: { id },
      data: {
        ...data,
        updatedById: data.updatedById,
      },
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
  }

  async deleteArticle(id: string) {
    return prisma.knowledgeArticle.update({ where: { id }, data: { isArchived: true } });
  }

  // ????????? Smart Search ?????????
  async smartSearch(query: string) {
    const q = query.toLowerCase();
    const articles = await prisma.knowledgeArticle.findMany({
      where: {
        isArchived: false,
        isPublished: true,
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
          { tags: { contains: q } },
          { excerpt: { contains: q } },
        ],
      },
      take: 20,
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
      },
    });
    return articles;
  }

  // ????????? Get related articles for context ?????????
  async getRelatedArticles(articleId: string, limit = 5) {
    const article = await prisma.knowledgeArticle.findUnique({ where: { id: articleId } });
    if (!article) return [];
    const tags = (article.tags || "").split(",").filter(Boolean).map(t => t.trim());
    const where: any = { id: { not: articleId }, isArchived: false, isPublished: true };
    if (tags.length > 0) {
      where.OR = tags.map(tag => ({ tags: { contains: tag } }));
      where.OR.push({ categoryId: article.categoryId });
    } else {
      where.categoryId = article.categoryId;
    }
    return prisma.knowledgeArticle.findMany({
      where,
      take: limit,
      orderBy: { viewCount: "desc" },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    });
  }
}

export const knowledgeService = new KnowledgeService();

