"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types";
import { formatRupiah } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const isAvailable = product.stock > 0;

  return (
    <Link href={`/products/${product.id}`}>
      <div className="card-border hover:shadow-sm transition-shadow cursor-pointer h-full">
        {/* Image */}
        <div className="relative aspect-video bg-bg-secondary overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary">
              No image
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3.5">
          {/* Stock Badge */}
          <div className="mb-2">
            <span
              className={`inline-block px-3 py-1 rounded-badge text-xs font-medium ${
                isAvailable
                  ? "bg-stock-available-bg text-stock-available-text"
                  : "bg-stock-outOfStock-bg text-stock-outOfStock-text"
              }`}
            >
              {isAvailable ? `${product.stock} tersedia` : "Habis"}
            </span>
          </div>

          {/* Name */}
          <h3 className="text-body font-medium text-text-primary mb-2 line-clamp-2">
            {product.name}
          </h3>

          {/* Price */}
          <p className="text-base font-medium text-text-primary">
            {formatRupiah(product.price)}
          </p>
        </div>
      </div>
    </Link>
  );
}
