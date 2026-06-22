import { prisma } from "../db";
import { createAuditLog } from "../utils/helpers";

type PrismaDelegate = {
  findUnique: (args: any) => any;
  findMany: (args?: any) => any;
  create: (args: any) => any;
  update: (args: any) => any;
  count: (args?: any) => any;
  [key: string]: any;
};

type WhereInput = Record<string, any>;

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ServiceOptions {
  entityName: string;
  delegates: Record<string, PrismaDelegate>;
  defaultInclude?: Record<string, any>;
  defaultOrderBy?: Record<string, string>;
  audit?: {
    create?: boolean;
    update?: boolean;
    delete?: boolean;
    view?: boolean;
    statusChange?: boolean;
  };
  rowLevelFilter?: (roleName: string, userId: string) => WhereInput;
}

export class BaseService {
  protected entityName: string;
  protected delegates: Record<string, PrismaDelegate>;
  protected defaultInclude: Record<string, any>;
  protected defaultOrderBy: Record<string, string>;
  protected audit: Required<NonNullable<ServiceOptions["audit"]>>;
  protected rowLevelFilter?: (roleName: string, userId: string) => WhereInput;

  constructor(opts: ServiceOptions) {
    this.entityName = opts.entityName;
    this.delegates = opts.delegates;
    this.defaultInclude = opts.defaultInclude || {};
    this.defaultOrderBy = opts.defaultOrderBy || { createdAt: "desc" };
    this.audit = {
      create: opts.audit?.create ?? true,
      update: opts.audit?.update ?? true,
      delete: opts.audit?.delete ?? true,
      view: opts.audit?.view ?? false,
      statusChange: opts.audit?.statusChange ?? true,
    };
    this.rowLevelFilter = opts.rowLevelFilter;
  }

  protected get delegate(): PrismaDelegate {
    return this.delegates[this.entityName];
  }

  async getAll(
    userId: string,
    roleName: string,
    additionalWhere: WhereInput = {},
    include?: Record<string, any>,
    orderBy?: Record<string, string>,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<any> | any[]> {
    const filter = {
      isArchived: false,
      ...(this.rowLevelFilter ? this.rowLevelFilter(roleName, userId) : {}),
      ...additionalWhere,
    };

    if (pagination) {
      const page = pagination.page || 1;
      const pageSize = pagination.pageSize || 50;
      const [data, total] = await Promise.all([
        this.delegate.findMany({
          where: filter,
          include: include || this.defaultInclude,
          orderBy: orderBy || this.defaultOrderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.delegate.count({ where: filter }),
      ]);
      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    return this.delegate.findMany({
      where: filter,
      include: include || this.defaultInclude,
      orderBy: orderBy || this.defaultOrderBy,
    });
  }

  async getById(id: string, userId?: string, include?: Record<string, any>) {
    const record = await this.delegate.findUnique({
      where: { id },
      include: include || this.defaultInclude,
    });
    if (!record) {
      const err: any = new Error(`${this.entityName} not found`);
      err.statusCode = 404;
      err.code = "NOT_FOUND";
      throw err;
    }
    if (userId && this.audit.view) {
      await createAuditLog({
        entityType: this.entityName,
        entityId: id,
        action: "VIEW",
        userId,
      }).catch(() => {});
    }
    return record;
  }

  async create(data: any, userId: string, extraData?: Record<string, any>) {
    const record = await this.delegate.create({
      data: { ...data, ...extraData },
    });

    if (this.audit.create) {
      try {
        await createAuditLog({
          entityType: this.entityName,
          entityId: record.id,
          action: "CREATE",
          userId,
          newValue: record,
        });
      } catch {}
    }

    return record;
  }

  async update(id: string, data: any, userId: string) {
    const old = await this.getById(id);

    const record = await this.delegate.update({
      where: { id },
      data,
    });

    if (this.audit.update) {
      try {
        await createAuditLog({
          entityType: this.entityName,
          entityId: id,
          action: "UPDATE",
          userId,
          oldValue: old,
          newValue: record,
        });
      } catch {}
    }

    return record;
  }

  async archive(id: string, userId: string) {
    const old = await this.getById(id);

    const record = await this.delegate.update({
      where: { id },
      data: { isArchived: true },
    });

    if (this.audit.delete) {
      await createAuditLog({
        entityType: this.entityName,
        entityId: id,
        action: "ARCHIVE",
        userId,
        oldValue: old,
      }).catch(() => {});
    }

    return record;
  }

  async updateStatus(id: string, status: string, userId: string, extraData?: Record<string, any>) {
    const old = await this.getById(id);

    const record = await this.delegate.update({
      where: { id },
      data: { status, ...extraData },
    });

    if (this.audit.statusChange) {
      await createAuditLog({
        entityType: this.entityName,
        entityId: id,
        action: "STATUS_CHANGE",
        userId,
        oldValue: { status: old.status },
        newValue: { status },
      }).catch(() => {});
    }

    return record;
  }
}
