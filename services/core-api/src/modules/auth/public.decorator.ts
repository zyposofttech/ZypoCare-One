import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
export const IS_PUBLIC_KEY="isPublic";
export const Public=()=>SetMetadata(IS_PUBLIC_KEY,true);
export const Principal=createParamDecorator((_data: unknown, ctx: ExecutionContext)=>{
  const req=ctx.switchToHttp().getRequest();
  return req?.principal;
});
